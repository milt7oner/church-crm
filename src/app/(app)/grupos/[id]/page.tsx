import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GrupoAcciones, type GrupoEditable } from '@/components/grupos/GrupoBotones'
import { MiembroAcciones, NuevoMiembroBoton, type MiembroEditable } from '@/components/grupos/MiembroBotones'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import { requirePerfil } from '@/lib/auth/perfil'
import { cargarOpcionesGrupo } from '@/lib/opciones'
import { puedeAdministrarGrupo, puedeGestionarGrupo } from '@/lib/permisos'
import { etiquetaSemana, hoy, semanaActual } from '@/lib/semana'
import { createClient } from '@/lib/supabase/server'
import type { Grupo } from '@/lib/types'
import { badgeOk, btnLink, btnPrimary, card } from '@/lib/ui'

export default async function GrupoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const perfil = await requirePerfil()
  const { id } = await params

  const supabase = await createClient()
  const { data } = await supabase
    .from('grupos')
    .select('id, iglesia_id, red_id, lider_grupo_id, nombre, direccion, dia_reunion, hora_reunion, activo')
    .eq('id', id)
    .eq('activo', true)
    .maybeSingle()
  const grupo = data as Grupo | null
  if (!grupo || !puedeGestionarGrupo(perfil, grupo)) notFound()

  const semana = semanaActual()
  const [{ data: red }, { data: lider }, { data: miembros }, { data: reportes }, opciones] = await Promise.all([
    supabase.from('redes').select('nombre').eq('id', grupo.red_id).maybeSingle(),
    grupo.lider_grupo_id
      ? supabase.from('perfiles').select('nombre_completo, telefono').eq('id', grupo.lider_grupo_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('miembros')
      .select('id, nombre_completo, telefono, direccion, fecha_ingreso, notas')
      .eq('grupo_id', id)
      .eq('activo', true)
      .order('nombre_completo'),
    supabase
      .from('reportes_grupo')
      .select('id, semana, tema, novedades, reportes_grupo_asistencia(asistio)')
      .eq('grupo_id', id)
      .order('semana', { ascending: false })
      .limit(8),
    cargarOpcionesGrupo(perfil),
  ])

  const reporteActual = (reportes ?? []).find((r) => r.semana === semana)
  const hoyIso = hoy()
  const reunion = [grupo.dia_reunion, grupo.hora_reunion?.slice(0, 5)].filter(Boolean).join(' ')

  return (
    <>
      <PageHeader titulo={grupo.nombre} subtitulo={red?.nombre} volver={{ href: '/grupos', label: 'Grupos' }}>
        <Link href={`/grupos/${id}/reporte`} className={btnPrimary}>
          {reporteActual ? 'Editar reporte de la semana' : 'Llenar reporte de la semana'}
        </Link>
      </PageHeader>

      <section className={`${card} p-4 space-y-3`}>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Líder</dt>
            <dd className="text-gray-800">{lider ? `${lider.nombre_completo}${lider.telefono ? ` · ${lider.telefono}` : ''}` : 'Sin asignar'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Reunión</dt>
            <dd className="text-gray-800">{reunion || '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Dirección</dt>
            <dd className="text-gray-800">{grupo.direccion || '—'}</dd>
          </div>
        </dl>
        <GrupoAcciones {...opciones} grupo={grupo as GrupoEditable} puedeAdministrar={puedeAdministrarGrupo(perfil, grupo)} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-gray-700">Miembros ({miembros?.length ?? 0})</h3>
          <NuevoMiembroBoton grupoId={id} hoy={hoyIso} />
        </div>
        {!miembros?.length ? (
          <EmptyState titulo="Este grupo aún no tiene miembros." detalle="Agrega a las personas que asisten al grupo." />
        ) : (
          <div className={`${card} divide-y divide-gray-100`}>
            {(miembros as MiembroEditable[]).map((m) => (
              <div key={m.id} className="p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{m.nombre_completo}</p>
                  <p className="text-xs text-gray-500 truncate">{[m.telefono, m.direccion].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</p>
                </div>
                <MiembroAcciones grupoId={id} miembro={m} hoy={hoyIso} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-gray-700">Reportes recientes</h3>
        {!reportes?.length ? (
          <EmptyState titulo="Aún no hay reportes para este grupo." />
        ) : (
          <div className={`${card} divide-y divide-gray-100`}>
            {reportes.map((r) => {
              const asistentes = r.reportes_grupo_asistencia.filter((a) => a.asistio).length
              return (
                <div key={r.id} className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800">{etiquetaSemana(r.semana)}</p>
                    <div className="flex items-center gap-3">
                      <span className={badgeOk}>
                        {asistentes}/{r.reportes_grupo_asistencia.length} asistieron
                      </span>
                      <Link href={`/grupos/${id}/reporte?semana=${r.semana}`} className={btnLink}>
                        Editar
                      </Link>
                    </div>
                  </div>
                  {r.tema && <p className="text-xs text-gray-700">Tema: {r.tema}</p>}
                  {r.novedades && <p className="text-xs text-gray-500 whitespace-pre-line">{r.novedades}</p>}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
