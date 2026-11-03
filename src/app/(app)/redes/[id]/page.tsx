import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NuevoGrupoBoton } from '@/components/grupos/GrupoBotones'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import { requirePerfil } from '@/lib/auth/perfil'
import { cargarOpcionesGrupo } from '@/lib/opciones'
import { puedeReportarRed } from '@/lib/permisos'
import { TIPO_RED_LABEL, type TipoRed } from '@/lib/redes'
import { esAdmin } from '@/lib/roles'
import { etiquetaSemana, semanaActual } from '@/lib/semana'
import { createClient } from '@/lib/supabase/server'
import { badgeNeutral, badgeOk, badgePendiente, btnLink, btnPrimary, card } from '@/lib/ui'

export default async function RedDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const perfil = await requirePerfil(['pastor', 'lider_admin', 'lider_red'])
  const { id } = await params
  if (perfil.rol === 'lider_red' && perfil.red_id !== id) notFound()

  const supabase = await createClient()
  const { data: red } = await supabase.from('redes').select('id, nombre, tipo, descripcion, activo').eq('id', id).maybeSingle()
  if (!red) notFound()

  const semana = semanaActual()
  const [{ data: lideres }, { data: grupos }, { data: reportesRed }, opciones] = await Promise.all([
    supabase.from('perfiles').select('id, nombre_completo, rol').eq('red_id', id).eq('activo', true),
    supabase.from('grupos').select('id, nombre, lider_grupo_id').eq('red_id', id).eq('activo', true).order('nombre'),
    supabase
      .from('reportes_red')
      .select('id, semana, novedades, reportes_red_grupos(grupo_id)')
      .eq('red_id', id)
      .order('semana', { ascending: false })
      .limit(8),
    cargarOpcionesGrupo(perfil),
  ])

  const idsGrupos = (grupos ?? []).map((g) => g.id)
  const [{ data: miembros }, { data: reportesSemana }] = idsGrupos.length
    ? await Promise.all([
        supabase.from('miembros').select('grupo_id').in('grupo_id', idsGrupos).eq('activo', true),
        supabase.from('reportes_grupo').select('grupo_id').in('grupo_id', idsGrupos).eq('semana', semana),
      ])
    : [{ data: [] }, { data: [] }]

  const liderRed = (lideres ?? []).find((l) => l.rol === 'lider_red')
  const nombreLider = new Map((lideres ?? []).map((l) => [l.id, l.nombre_completo]))
  const reportados = new Set((reportesSemana ?? []).map((r) => r.grupo_id))
  const miembrosPorGrupo = new Map<string, number>()
  ;(miembros ?? []).forEach((m) => miembrosPorGrupo.set(m.grupo_id, (miembrosPorGrupo.get(m.grupo_id) ?? 0) + 1))
  const reporteActual = (reportesRed ?? []).find((r) => r.semana === semana)

  return (
    <>
      <PageHeader
        titulo={red.nombre}
        subtitulo={
          <span className="block space-y-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className={badgeNeutral}>Red de {TIPO_RED_LABEL[red.tipo as TipoRed].toLowerCase()}</span>
              <span>Líder de red: {liderRed?.nombre_completo ?? 'sin asignar'}</span>
            </span>
            {red.descripcion && <span className="block whitespace-pre-line">Zonas: {red.descripcion}</span>}
          </span>
        }
        volver={esAdmin(perfil.rol) ? { href: '/redes', label: 'Redes' } : undefined}
      >
        {puedeReportarRed(perfil, red.id) && (
          <Link href={`/redes/${red.id}/reporte`} className={btnPrimary}>
            {reporteActual ? 'Editar reporte de la semana' : 'Llenar reporte de la semana'}
          </Link>
        )}
      </PageHeader>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-gray-700">
            Grupos ({reportados.size}/{idsGrupos.length} reportados · {etiquetaSemana(semana)})
          </h3>
          <NuevoGrupoBoton {...opciones} redFija={red.id} />
        </div>
        {!grupos?.length ? (
          <EmptyState titulo="Esta red aún no tiene grupos." detalle="Usa el botón “Nuevo grupo” para crear uno." />
        ) : (
          <div className={`${card} divide-y divide-gray-100`}>
            {grupos.map((g) => (
              <Link key={g.id} href={`/grupos/${g.id}`} className="flex items-center justify-between gap-3 p-3.5 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{g.nombre}</p>
                  <p className="text-xs text-gray-500">
                    {g.lider_grupo_id ? nombreLider.get(g.lider_grupo_id) : 'Sin líder'} · {miembrosPorGrupo.get(g.id) ?? 0} miembros
                  </p>
                </div>
                {reportados.has(g.id) ? <span className={badgeOk}>Reportado</span> : <span className={badgePendiente}>Pendiente</span>}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-gray-700">Reportes de red recientes</h3>
        {!reportesRed?.length ? (
          <EmptyState titulo="Aún no hay reportes de red." />
        ) : (
          <div className={`${card} divide-y divide-gray-100`}>
            {reportesRed.map((r) => (
              <div key={r.id} className="p-3.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800">{etiquetaSemana(r.semana)}</p>
                  <div className="flex items-center gap-3">
                    <span className={badgeOk}>{r.reportes_red_grupos.length} grupos con seguimiento</span>
                    {puedeReportarRed(perfil, red.id) && (
                      <Link href={`/redes/${red.id}/reporte?semana=${r.semana}`} className={btnLink}>
                        Editar
                      </Link>
                    )}
                  </div>
                </div>
                {r.novedades && <p className="text-xs text-gray-600 whitespace-pre-line">{r.novedades}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
