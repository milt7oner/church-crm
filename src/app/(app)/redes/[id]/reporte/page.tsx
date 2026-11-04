import { notFound } from 'next/navigation'
import ReporteRedDetalle from '@/components/reportes/ReporteRedDetalle'
import ReporteRedForm from '@/components/reportes/ReporteRedForm'
import SemanaSelector from '@/components/reportes/SemanaSelector'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import { requirePerfil } from '@/lib/auth/perfil'
import { puedeReportarRed } from '@/lib/permisos'
import { etiquetaSemana, semanaDesdeParam, ultimasSemanas } from '@/lib/semana'
import { createClient } from '@/lib/supabase/server'

type FilaSeguimiento = { grupo_id: string; grupos: { nombre: string } | null }

export default async function ReporteRedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ semana?: string }>
}) {
  const perfil = await requirePerfil(['pastor', 'lider_admin', 'lider_red'])
  const [{ id }, { semana: semanaParam }] = await Promise.all([params, searchParams])
  if (perfil.rol === 'lider_red' && perfil.red_id !== id) notFound()
  const editable = puedeReportarRed(perfil, id)
  const semana = semanaDesdeParam(semanaParam)

  const supabase = await createClient()
  const [{ data: red }, { data: grupos }, { data: lideres }, { data: reporte }] = await Promise.all([
    supabase.from('redes').select('nombre').eq('id', id).maybeSingle(),
    supabase.from('grupos').select('id, nombre, lider_grupo_id').eq('red_id', id).eq('activo', true).order('nombre'),
    supabase.from('perfiles').select('id, nombre_completo').eq('red_id', id).eq('rol', 'lider_grupo'),
    supabase
      .from('reportes_red')
      .select('novedades, created_at, updated_at, perfiles(nombre_completo), reportes_red_grupos(grupo_id, grupos(nombre))')
      .eq('red_id', id)
      .eq('semana', semana)
      .maybeSingle(),
  ])
  if (!red) notFound()

  const seguimiento = (reporte?.reportes_red_grupos ?? []) as unknown as FilaSeguimiento[]
  const semanas = ultimasSemanas(8).map((s) => ({ value: s, label: etiquetaSemana(s) }))

  return (
    <>
      <PageHeader
        titulo="Reporte de red"
        subtitulo={`${red.nombre} · ${editable ? (reporte ? 'Editando reporte guardado' : 'Nuevo reporte') : 'Solo lectura'}`}
        volver={{ href: `/redes/${id}`, label: red.nombre }}
      >
        <SemanaSelector semanas={semanas} actual={semana} basePath={`/redes/${id}/reporte`} />
      </PageHeader>

      {editable ? (
        <FormularioRed
          redId={id}
          semana={semana}
          grupos={grupos ?? []}
          lideres={lideres ?? []}
          novedades={reporte?.novedades ?? ''}
          gruposIds={seguimiento.map((s) => s.grupo_id)}
        />
      ) : reporte ? (
        <ReporteRedDetalle
          reporte={reporte}
          autor={(reporte.perfiles as unknown as { nombre_completo: string } | null)?.nombre_completo ?? null}
          grupos={gruposDelReporte(grupos ?? [], seguimiento)}
        />
      ) : (
        <EmptyState titulo="El líder de red no ha enviado el reporte de esta semana." detalle={etiquetaSemana(semana)} />
      )}
    </>
  )
}

/** Active groups of the network plus any followed-up group that has since been deactivated. */
function gruposDelReporte(grupos: { id: string; nombre: string }[], seguimiento: FilaSeguimiento[]) {
  const marcados = new Set(seguimiento.map((s) => s.grupo_id))
  const activos = new Set(grupos.map((g) => g.id))
  return [
    ...grupos.map((g) => ({ nombre: g.nombre, seguimiento: marcados.has(g.id) })),
    ...seguimiento
      .filter((s) => !activos.has(s.grupo_id))
      .map((s) => ({ nombre: s.grupos?.nombre ?? 'Grupo desactivado', seguimiento: true })),
  ]
}

async function FormularioRed({
  redId,
  semana,
  grupos,
  lideres,
  novedades,
  gruposIds,
}: {
  redId: string
  semana: string
  grupos: { id: string; nombre: string; lider_grupo_id: string | null }[]
  lideres: { id: string; nombre_completo: string }[]
  novedades: string
  gruposIds: string[]
}) {
  const supabase = await createClient()
  const idsGrupos = grupos.map((g) => g.id)
  const { data: reportesGrupo } = idsGrupos.length
    ? await supabase.from('reportes_grupo').select('grupo_id').in('grupo_id', idsGrupos).eq('semana', semana)
    : { data: [] }

  const nombreLider = new Map(lideres.map((l) => [l.id, l.nombre_completo]))
  const reportados = new Set((reportesGrupo ?? []).map((r) => r.grupo_id))

  return (
    <ReporteRedForm
      key={semana}
      redId={redId}
      semana={semana}
      grupos={grupos.map((g) => ({
        id: g.id,
        nombre: g.nombre,
        detalle: [
          g.lider_grupo_id ? nombreLider.get(g.lider_grupo_id) : 'Sin líder',
          reportados.has(g.id) ? 'reporte entregado' : 'sin reporte esta semana',
        ].join(' · '),
      }))}
      inicial={{ novedades, gruposIds }}
    />
  )
}
