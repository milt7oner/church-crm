import { notFound } from 'next/navigation'
import ReporteRedForm from '@/components/reportes/ReporteRedForm'
import SemanaSelector from '@/components/reportes/SemanaSelector'
import PageHeader from '@/components/ui/PageHeader'
import { requirePerfil } from '@/lib/auth/perfil'
import { puedeReportarRed } from '@/lib/permisos'
import { etiquetaSemana, semanaDesdeParam, ultimasSemanas } from '@/lib/semana'
import { createClient } from '@/lib/supabase/server'

export default async function ReporteRedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ semana?: string }>
}) {
  const perfil = await requirePerfil(['lider_red'])
  const [{ id }, { semana: semanaParam }] = await Promise.all([params, searchParams])
  if (!puedeReportarRed(perfil, id)) notFound()
  const semana = semanaDesdeParam(semanaParam)

  const supabase = await createClient()
  const [{ data: red }, { data: grupos }, { data: lideres }, { data: reporte }] = await Promise.all([
    supabase.from('redes').select('nombre').eq('id', id).maybeSingle(),
    supabase.from('grupos').select('id, nombre, lider_grupo_id').eq('red_id', id).eq('activo', true).order('nombre'),
    supabase.from('perfiles').select('id, nombre_completo').eq('red_id', id).eq('rol', 'lider_grupo'),
    supabase
      .from('reportes_red')
      .select('novedades, reportes_red_grupos(grupo_id)')
      .eq('red_id', id)
      .eq('semana', semana)
      .maybeSingle(),
  ])
  if (!red) notFound()

  const idsGrupos = (grupos ?? []).map((g) => g.id)
  const { data: reportesGrupo } = idsGrupos.length
    ? await supabase.from('reportes_grupo').select('grupo_id').in('grupo_id', idsGrupos).eq('semana', semana)
    : { data: [] }

  const nombreLider = new Map((lideres ?? []).map((l) => [l.id, l.nombre_completo]))
  const reportados = new Set((reportesGrupo ?? []).map((r) => r.grupo_id))
  const semanas = ultimasSemanas(8).map((s) => ({ value: s, label: etiquetaSemana(s) }))

  return (
    <>
      <PageHeader
        titulo="Reporte de red"
        subtitulo={`${red.nombre} · ${reporte ? 'Editando reporte guardado' : 'Nuevo reporte'}`}
        volver={{ href: `/redes/${id}`, label: red.nombre }}
      >
        <SemanaSelector semanas={semanas} actual={semana} basePath={`/redes/${id}/reporte`} />
      </PageHeader>

      <ReporteRedForm
        key={semana}
        redId={id}
        semana={semana}
        grupos={(grupos ?? []).map((g) => ({
          id: g.id,
          nombre: g.nombre,
          detalle: [
            g.lider_grupo_id ? nombreLider.get(g.lider_grupo_id) : 'Sin líder',
            reportados.has(g.id) ? 'reporte entregado' : 'sin reporte esta semana',
          ].join(' · '),
        }))}
        inicial={{
          novedades: reporte?.novedades ?? '',
          gruposIds: (reporte?.reportes_red_grupos ?? []).map((r) => r.grupo_id),
        }}
      />
    </>
  )
}
