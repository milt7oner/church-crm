// Builds the sheets of the downloadable report. Pure: the route handler turns
// them into an .xlsx file with write-excel-file.
import type { Cell, Sheet } from 'write-excel-file/node'
import { asistentesDe, type DatosReporte, type Resumen } from '@/lib/estadisticas'
import { TIPO_RED_LABEL, type TipoRed } from '@/lib/redes'
import { hoy, sumarDias } from '@/lib/semana'

export type MetaExcel = { tipo: TipoRed | null; redNombre: string | null; ahora?: Date }

type Columna<T> = { titulo: string; ancho: number; valor: (fila: T) => Cell }

const ENCABEZADO = { fontWeight: 'bold', backgroundColor: '#E5F0F0', textColor: '#00524F' } as const

function fecha(iso: string | null | undefined): Cell {
  return iso ? { value: new Date(`${iso}T00:00:00Z`), type: Date, format: 'dd/mm/yyyy' } : null
}

function decimal(n: number | null): Cell {
  return n === null ? null : { value: n, type: Number, format: '0.0' }
}

/** Percentages are stored as fractions so Sheets/Excel can chart and sum them. */
function pct(n: number | null): Cell {
  return n === null ? null : { value: n / 100, type: Number, format: '0%' }
}

function texto(s: string | null | undefined): Cell {
  return s ? { value: s, type: String, wrap: true } : null
}

function hoja<T>(nombre: string, columnas: Columna<T>[], filas: T[]): Sheet<never> {
  return {
    sheet: nombre,
    stickyRowsCount: 1,
    columns: columnas.map((c) => ({ width: c.ancho })),
    data: [columnas.map((c) => ({ value: c.titulo, ...ENCABEZADO })), ...filas.map((f) => columnas.map((c) => c.valor(f)))],
  }
}

export function nombreArchivo(resumen: Resumen): string {
  const desde = resumen.semanas[0]
  const hasta = sumarDias(resumen.semanas[resumen.semanas.length - 1], 6)
  return `casas-de-vida_${desde}_${hasta}.xlsx`
}

export function hojasExcel(resumen: Resumen, datos: DatosReporte, meta: MetaExcel): Sheet<never>[] {
  const enPeriodo = new Set(resumen.semanas)
  const grupoPorId = new Map(datos.grupos.map((g) => [g.id, g]))
  const redPorId = new Map(datos.redes.map((r) => [r.id, r]))
  const liderPorId = new Map(datos.lideres.map((l) => [l.id, l.nombre_completo]))
  const nombreRedDeGrupo = (grupoId: string) => redPorId.get(grupoPorId.get(grupoId)?.red_id ?? '')?.nombre ?? null
  const miembrosEnLista = (r: DatosReporte['reportesGrupo'][number]) => r.asistencia.length

  const reportesGrupo = datos.reportesGrupo
    .filter((r) => enPeriodo.has(r.semana))
    .sort((a, b) => b.semana.localeCompare(a.semana) || (grupoPorId.get(a.grupo_id)?.nombre ?? '').localeCompare(grupoPorId.get(b.grupo_id)?.nombre ?? '', 'es'))
  const reportesRed = datos.reportesRed.filter((r) => enPeriodo.has(r.semana)).sort((a, b) => b.semana.localeCompare(a.semana))

  const resumenFilas: [string, Cell][] = [
    ['Desde', fecha(resumen.semanas[0])],
    ['Hasta', fecha(sumarDias(resumen.semanas[resumen.semanas.length - 1], 6))],
    ['Tipo de red', meta.tipo ? TIPO_RED_LABEL[meta.tipo] : 'Todas'],
    ['Red', meta.redNombre ?? 'Todas'],
    ['Asistencia promedio por semana', decimal(resumen.actual.promedioSemanal)],
    ['Asistencia promedio del período anterior', decimal(resumen.anterior.promedioSemanal)],
    ['Miembros que asistieron (suma de reuniones)', resumen.actual.miembros],
    ['Visitantes (suma de reuniones)', resumen.actual.visitantes],
    ['Reuniones reportadas', resumen.actual.reuniones],
    ['Reportes de grupo entregados', resumen.cumplimiento.entregados],
    ['Reportes de grupo esperados', resumen.cumplimiento.esperados],
    ['% reportes de grupo', pct(resumen.cumplimiento.porcentaje)],
    ['% grupos con seguimiento de red', pct(resumen.seguimiento.porcentaje)],
    ['Redes', resumen.porRed.length],
    ['Grupos activos', resumen.porGrupo.length],
    ['Miembros activos', resumen.miembrosActivos],
    ['Miembros nuevos en el período', resumen.miembrosNuevos],
    ['Personas para contactar', resumen.paraContactar.length],
    ['Generado el', fecha(hoy(meta.ahora))],
  ]

  return [
    hoja<[string, Cell]>(
      'Resumen',
      [
        { titulo: 'Concepto', ancho: 42, valor: (f) => f[0] },
        { titulo: 'Valor', ancho: 18, valor: (f) => f[1] },
      ],
      resumenFilas
    ),

    hoja(
      'Por red',
      [
        { titulo: 'Red', ancho: 26, valor: (f) => f.red.nombre },
        { titulo: 'Tipo', ancho: 10, valor: (f) => TIPO_RED_LABEL[f.red.tipo] },
        { titulo: 'Líder de red', ancho: 24, valor: (f) => f.lider },
        { titulo: 'Grupos', ancho: 8, valor: (f) => f.grupos },
        { titulo: 'Miembros', ancho: 10, valor: (f) => f.miembros },
        { titulo: 'Asistencia promedio semanal', ancho: 14, valor: (f) => decimal(f.promedioSemanal) },
        { titulo: 'Cambio vs. período anterior', ancho: 14, valor: (f) => decimal(f.tendencia?.diferencia ?? null) },
        { titulo: 'Visitantes', ancho: 10, valor: (f) => f.visitantes },
        { titulo: 'Reportes entregados', ancho: 12, valor: (f) => f.cumplimiento.entregados },
        { titulo: 'Reportes esperados', ancho: 12, valor: (f) => f.cumplimiento.esperados },
        { titulo: '% reportes', ancho: 10, valor: (f) => pct(f.cumplimiento.porcentaje) },
        { titulo: 'Grupos con seguimiento', ancho: 12, valor: (f) => f.seguimiento.conSeguimiento },
        { titulo: '% seguimiento', ancho: 12, valor: (f) => pct(f.seguimiento.porcentaje) },
        { titulo: 'Reportes de red', ancho: 10, valor: (f) => f.reportesRed },
        { titulo: 'Personas para contactar', ancho: 12, valor: (f) => f.paraContactar },
      ],
      resumen.porRed
    ),

    hoja(
      'Por grupo',
      [
        { titulo: 'Grupo', ancho: 28, valor: (f) => f.grupo.nombre },
        { titulo: 'Red', ancho: 22, valor: (f) => f.red?.nombre ?? null },
        { titulo: 'Tipo', ancho: 10, valor: (f) => (f.red ? TIPO_RED_LABEL[f.red.tipo] : null) },
        { titulo: 'Líder de grupo', ancho: 24, valor: (f) => f.lider },
        { titulo: 'Miembros', ancho: 10, valor: (f) => f.miembros },
        { titulo: 'Asistencia promedio por reunión', ancho: 14, valor: (f) => decimal(f.promedio) },
        { titulo: 'Cambio vs. período anterior', ancho: 14, valor: (f) => decimal(f.tendencia?.diferencia ?? null) },
        { titulo: 'Visitantes', ancho: 10, valor: (f) => f.visitantes },
        { titulo: 'Reportes entregados', ancho: 12, valor: (f) => f.cumplimiento.entregados },
        { titulo: 'Reportes esperados', ancho: 12, valor: (f) => f.cumplimiento.esperados },
        { titulo: '% reportes', ancho: 10, valor: (f) => pct(f.cumplimiento.porcentaje) },
        { titulo: 'Semanas seguidas sin reporte', ancho: 14, valor: (f) => f.semanasSinReporte },
        { titulo: 'Último seguimiento de red (semana)', ancho: 16, valor: (f) => fecha(f.ultimoSeguimiento) },
        { titulo: 'Personas para contactar', ancho: 12, valor: (f) => f.paraContactar },
      ],
      resumen.porGrupo
    ),

    hoja(
      'Asistencia semanal',
      [
        { titulo: 'Semana (lunes)', ancho: 14, valor: (r) => fecha(r.semana) },
        { titulo: 'Red', ancho: 22, valor: (r) => nombreRedDeGrupo(r.grupo_id) },
        { titulo: 'Grupo', ancho: 28, valor: (r) => grupoPorId.get(r.grupo_id)?.nombre ?? null },
        { titulo: 'Fecha de reunión', ancho: 14, valor: (r) => fecha(r.fecha_reunion) },
        { titulo: 'Miembros que asistieron', ancho: 12, valor: (r) => asistentesDe(r) },
        { titulo: 'Miembros en la lista', ancho: 12, valor: (r) => miembrosEnLista(r) },
        { titulo: 'Visitantes', ancho: 10, valor: (r) => r.visitantes },
        { titulo: 'Total asistentes', ancho: 10, valor: (r) => asistentesDe(r) + r.visitantes },
        { titulo: 'Tema', ancho: 32, valor: (r) => texto(r.tema) },
      ],
      reportesGrupo
    ),

    hoja(
      'Asistencia por persona',
      [
        { titulo: 'Nombre', ancho: 28, valor: (p) => p.miembro.nombre_completo },
        { titulo: 'Teléfono', ancho: 14, valor: (p) => p.miembro.telefono },
        { titulo: 'Grupo', ancho: 26, valor: (p) => grupoPorId.get(p.miembro.grupo_id)?.nombre ?? null },
        { titulo: 'Red', ancho: 22, valor: (p) => nombreRedDeGrupo(p.miembro.grupo_id) },
        { titulo: 'Reuniones a las que asistió', ancho: 12, valor: (p) => p.asistio },
        { titulo: 'Reuniones que faltó', ancho: 12, valor: (p) => p.falto },
        { titulo: '% asistencia', ancho: 10, valor: (p) => pct(p.porcentaje) },
        { titulo: 'Faltas seguidas', ancho: 10, valor: (p) => p.faltasSeguidas },
        { titulo: 'Fecha de ingreso', ancho: 14, valor: (p) => fecha(p.miembro.fecha_ingreso) },
      ],
      [...resumen.personas].sort((a, b) => a.miembro.nombre_completo.localeCompare(b.miembro.nombre_completo, 'es'))
    ),

    hoja(
      'Personas para contactar',
      [
        { titulo: 'Nombre', ancho: 28, valor: (p) => p.miembro.nombre_completo },
        { titulo: 'Teléfono', ancho: 14, valor: (p) => p.miembro.telefono },
        { titulo: 'Grupo', ancho: 26, valor: (p) => grupoPorId.get(p.miembro.grupo_id)?.nombre ?? null },
        { titulo: 'Red', ancho: 22, valor: (p) => nombreRedDeGrupo(p.miembro.grupo_id) },
        {
          titulo: 'Líder del grupo',
          ancho: 24,
          valor: (p) => {
            const lider = grupoPorId.get(p.miembro.grupo_id)?.lider_grupo_id
            return lider ? (liderPorId.get(lider) ?? null) : null
          },
        },
        { titulo: 'Reuniones seguidas que faltó', ancho: 14, valor: (p) => p.faltasSeguidas },
      ],
      resumen.paraContactar
    ),

    hoja(
      'Reportes de red',
      [
        { titulo: 'Semana (lunes)', ancho: 14, valor: (r) => fecha(r.semana) },
        { titulo: 'Red', ancho: 22, valor: (r) => redPorId.get(r.red_id)?.nombre ?? null },
        { titulo: 'Grupos con seguimiento', ancho: 12, valor: (r) => r.grupos.length },
        {
          titulo: 'Grupos',
          ancho: 40,
          valor: (r) => texto(r.grupos.map((id) => grupoPorId.get(id)?.nombre ?? 'Grupo desactivado').join(', ')),
        },
        { titulo: 'Novedades', ancho: 60, valor: (r) => texto(r.novedades) },
      ],
      reportesRed
    ),

    hoja(
      'Novedades de grupos',
      [
        { titulo: 'Semana (lunes)', ancho: 14, valor: (r) => fecha(r.semana) },
        { titulo: 'Red', ancho: 22, valor: (r) => nombreRedDeGrupo(r.grupo_id) },
        { titulo: 'Grupo', ancho: 28, valor: (r) => grupoPorId.get(r.grupo_id)?.nombre ?? null },
        { titulo: 'Tema', ancho: 30, valor: (r) => texto(r.tema) },
        { titulo: 'Novedades', ancho: 60, valor: (r) => texto(r.novedades) },
      ],
      reportesGrupo.filter((r) => r.novedades)
    ),
  ]
}
