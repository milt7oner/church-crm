import type {
  DatosReporte,
  GrupoDatos,
  LiderDatos,
  MiembroDatos,
  Periodo,
  RedDatos,
  ReporteGrupoDatos,
  ReporteRedDatos,
} from '@/lib/estadisticas'
import { semanasHasta } from '@/lib/estadisticas'
import type { TipoRed } from '@/lib/redes'
import { sumarDias } from '@/lib/semana'
import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

export type FiltrosReporte = {
  periodo: Periodo
  semanaActual: string
  redId?: string | null
  tipo?: TipoRed | null
  grupoId?: string | null
}

/** Supabase returns at most 1000 rows per request; six months of attendance can exceed that. */
export const TAMANO_PAGINA = 1000

export async function todasLasFilas<T>(
  pagina: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const filas: T[] = []
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await pagina(desde, desde + TAMANO_PAGINA - 1)
    if (error) throw new Error(error.message)
    filas.push(...(data ?? []))
    if (!data || data.length < TAMANO_PAGINA) return filas
  }
}

type FilaReporteGrupo = Omit<ReporteGrupoDatos, 'asistencia'> & {
  reportes_grupo_asistencia: ReporteGrupoDatos['asistencia']
}
type FilaReporteRed = Omit<ReporteRedDatos, 'grupos'> & { reportes_red_grupos: { grupo_id: string }[] }

/**
 * Loads everything a report needs for the period and the one before it, using
 * the session client: RLS already limits each role to what it may see.
 */
export async function cargarDatosReporte(supabase: Supabase, filtros: FiltrosReporte): Promise<DatosReporte> {
  const semanas = semanasHasta(filtros.semanaActual, filtros.periodo)
  const semanasAnteriores = semanasHasta(sumarDias(semanas[0], -7), filtros.periodo)
  const desde = semanasAnteriores[0]

  const [redes, grupos, lideres, miembros, reportesGrupo, reportesRed] = await Promise.all([
    todasLasFilas<RedDatos>((a, b) =>
      supabase.from('redes').select('id, nombre, tipo').eq('activo', true).order('nombre').order('id').range(a, b)
    ),
    todasLasFilas<GrupoDatos>((a, b) =>
      supabase
        .from('grupos')
        .select('id, nombre, red_id, lider_grupo_id, created_at')
        .eq('activo', true)
        .order('nombre')
        .order('id')
        .range(a, b)
    ),
    todasLasFilas<LiderDatos>((a, b) =>
      supabase
        .from('perfiles')
        .select('id, nombre_completo, rol, red_id')
        .eq('activo', true)
        .in('rol', ['lider_red', 'lider_grupo'])
        .order('id')
        .range(a, b)
    ),
    todasLasFilas<MiembroDatos>((a, b) =>
      supabase
        .from('miembros')
        .select('id, grupo_id, nombre_completo, telefono, fecha_ingreso')
        .eq('activo', true)
        .order('nombre_completo')
        .order('id')
        .range(a, b)
    ),
    todasLasFilas<FilaReporteGrupo>((a, b) =>
      supabase
        .from('reportes_grupo')
        .select('grupo_id, semana, fecha_reunion, tema, novedades, visitantes, reportes_grupo_asistencia(miembro_id, asistio)')
        .gte('semana', desde)
        .order('semana')
        .order('id')
        .range(a, b)
    ),
    todasLasFilas<FilaReporteRed>((a, b) =>
      supabase
        .from('reportes_red')
        .select('red_id, semana, novedades, reportes_red_grupos(grupo_id)')
        .gte('semana', desde)
        .order('semana')
        .order('id')
        .range(a, b)
    ),
  ])

  const redesFiltradas = redes.filter(
    (r) => (!filtros.tipo || r.tipo === filtros.tipo) && (!filtros.redId || r.id === filtros.redId)
  )
  const idsRedes = new Set(redesFiltradas.map((r) => r.id))
  const gruposFiltrados = grupos.filter((g) => idsRedes.has(g.red_id) && (!filtros.grupoId || g.id === filtros.grupoId))
  const idsGrupos = new Set(gruposFiltrados.map((g) => g.id))

  return {
    semanas,
    semanasAnteriores,
    redes: redesFiltradas,
    grupos: gruposFiltrados,
    lideres,
    miembros: miembros.filter((m) => idsGrupos.has(m.grupo_id)),
    reportesGrupo: reportesGrupo
      .filter((r) => idsGrupos.has(r.grupo_id))
      .map(({ reportes_grupo_asistencia, ...r }) => ({ ...r, asistencia: reportes_grupo_asistencia ?? [] })),
    reportesRed: reportesRed
      .filter((r) => idsRedes.has(r.red_id))
      .map(({ reportes_red_grupos, ...r }) => ({ ...r, grupos: (reportes_red_grupos ?? []).map((g) => g.grupo_id) })),
  }
}
