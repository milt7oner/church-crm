import { notFound } from 'next/navigation'
import ReporteGrupoDetalle from '@/components/reportes/ReporteGrupoDetalle'
import ReporteGrupoForm from '@/components/reportes/ReporteGrupoForm'
import SemanaSelector from '@/components/reportes/SemanaSelector'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import { requirePerfil } from '@/lib/auth/perfil'
import { puedeGestionarGrupo, puedeReportarGrupo } from '@/lib/permisos'
import { etiquetaSemana, hoy, semanaDesdeParam, sumarDias, ultimasSemanas } from '@/lib/semana'
import { createClient } from '@/lib/supabase/server'

type FilaAsistencia = { miembro_id: string; asistio: boolean; miembros: { nombre_completo: string } | null }

export default async function ReporteGrupoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ semana?: string }>
}) {
  const perfil = await requirePerfil()
  const [{ id }, { semana: semanaParam }] = await Promise.all([params, searchParams])
  const semana = semanaDesdeParam(semanaParam)

  const supabase = await createClient()
  const { data: grupo } = await supabase
    .from('grupos')
    .select('id, nombre, iglesia_id, red_id, lider_grupo_id')
    .eq('id', id)
    .eq('activo', true)
    .maybeSingle()
  if (!grupo || !puedeGestionarGrupo(perfil, grupo)) notFound()
  const editable = puedeReportarGrupo(perfil, grupo)

  const [{ data: miembros }, { data: reporte }] = await Promise.all([
    supabase.from('miembros').select('id, nombre_completo, telefono').eq('grupo_id', id).eq('activo', true).order('nombre_completo'),
    supabase
      .from('reportes_grupo')
      .select(
        'fecha_reunion, tema, novedades, created_at, updated_at, perfiles(nombre_completo), reportes_grupo_asistencia(miembro_id, asistio, miembros(nombre_completo))'
      )
      .eq('grupo_id', id)
      .eq('semana', semana)
      .maybeSingle(),
  ])

  const asistencia = (reporte?.reportes_grupo_asistencia ?? []) as unknown as FilaAsistencia[]
  const autor = (reporte?.perfiles as unknown as { nombre_completo: string } | null)?.nombre_completo ?? null
  const hoyIso = hoy()
  const finSemana = sumarDias(semana, 6)
  const fechaMax = finSemana < hoyIso ? finSemana : hoyIso
  const semanas = ultimasSemanas(8).map((s) => ({ value: s, label: etiquetaSemana(s) }))

  return (
    <>
      <PageHeader
        titulo="Reporte semanal"
        subtitulo={`${grupo.nombre} · ${editable ? (reporte ? 'Editando reporte guardado' : 'Nuevo reporte') : 'Solo lectura'}`}
        volver={{ href: `/grupos/${id}`, label: grupo.nombre }}
      >
        <SemanaSelector semanas={semanas} actual={semana} basePath={`/grupos/${id}/reporte`} />
      </PageHeader>

      {editable ? (
        <ReporteGrupoForm
          key={semana}
          grupoId={id}
          semana={semana}
          fechaMin={semana}
          fechaMax={fechaMax}
          miembros={miembros ?? []}
          inicial={{
            fechaReunion: reporte?.fecha_reunion ?? fechaMax,
            tema: reporte?.tema ?? '',
            novedades: reporte?.novedades ?? '',
            asistentes: asistencia.filter((a) => a.asistio).map((a) => a.miembro_id),
          }}
        />
      ) : reporte ? (
        <ReporteGrupoDetalle
          reporte={reporte}
          autor={autor}
          asistencia={asistencia
            .map((a) => ({ nombre: a.miembros?.nombre_completo ?? 'Miembro', asistio: a.asistio }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))}
        />
      ) : (
        <EmptyState titulo="El líder del grupo no ha enviado el reporte de esta semana." detalle={etiquetaSemana(semana)} />
      )}
    </>
  )
}
