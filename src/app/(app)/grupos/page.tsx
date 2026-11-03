import Link from 'next/link'
import { NuevoGrupoBoton } from '@/components/grupos/GrupoBotones'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import { requirePerfil } from '@/lib/auth/perfil'
import { cargarOpcionesGrupo } from '@/lib/opciones'
import { esAdmin } from '@/lib/roles'
import { semanaActual } from '@/lib/semana'
import { createClient } from '@/lib/supabase/server'
import { badgeOk, badgePendiente, card } from '@/lib/ui'

export default async function GruposPage({ searchParams }: { searchParams: Promise<{ red?: string }> }) {
  const perfil = await requirePerfil()
  const { red: filtroRed } = await searchParams
  const admin = esAdmin(perfil.rol)
  const puedeCrear = admin || (perfil.rol === 'lider_red' && Boolean(perfil.red_id))

  const supabase = await createClient()
  let consulta = supabase
    .from('grupos')
    .select('id, nombre, red_id, lider_grupo_id, dia_reunion, hora_reunion')
    .eq('activo', true)
    .order('nombre')
  if (admin && filtroRed) consulta = consulta.eq('red_id', filtroRed)

  const [{ data: grupos }, opciones, { data: miembros }, { data: reportes }] = await Promise.all([
    consulta,
    cargarOpcionesGrupo(perfil),
    supabase.from('miembros').select('grupo_id').eq('activo', true),
    supabase.from('reportes_grupo').select('grupo_id').eq('semana', semanaActual()),
  ])

  const nombreRed = new Map(opciones.redes.map((r) => [r.id, r.nombre]))
  const nombreLider = new Map(opciones.lideres.map((l) => [l.id, l.nombre_completo]))
  const reportados = new Set((reportes ?? []).map((r) => r.grupo_id))
  const miembrosPorGrupo = new Map<string, number>()
  ;(miembros ?? []).forEach((m) => miembrosPorGrupo.set(m.grupo_id, (miembrosPorGrupo.get(m.grupo_id) ?? 0) + 1))

  return (
    <>
      <PageHeader titulo={perfil.rol === 'lider_grupo' ? 'Mis grupos' : 'Grupos'} subtitulo="Casas de Vida activas">
        {puedeCrear && <NuevoGrupoBoton {...opciones} />}
      </PageHeader>

      {admin && opciones.redes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{ id: '', nombre: 'Todas' }, ...opciones.redes].map((red) => (
            <Link
              key={red.id || 'todas'}
              href={red.id ? `/grupos?red=${red.id}` : '/grupos'}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                (filtroRed ?? '') === red.id
                  ? 'bg-[#006C69] text-white border-[#006C69]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#006C69]'
              }`}
            >
              {red.nombre}
            </Link>
          ))}
        </div>
      )}

      {!grupos?.length ? (
        <EmptyState
          titulo="No hay grupos para mostrar."
          detalle={puedeCrear ? 'Usa el botón “Nuevo grupo” para crear uno.' : 'Tu líder de red te asignará tus grupos.'}
        />
      ) : (
        <div className={`${card} divide-y divide-gray-100`}>
          {grupos.map((g) => (
            <Link key={g.id} href={`/grupos/${g.id}`} className="flex items-center justify-between gap-3 p-3.5 hover:bg-gray-50">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">{g.nombre}</p>
                <p className="text-xs text-gray-500 truncate">
                  {[
                    perfil.rol !== 'lider_grupo' ? (g.lider_grupo_id ? nombreLider.get(g.lider_grupo_id) : 'Sin líder') : null,
                    admin ? nombreRed.get(g.red_id) : null,
                    `${miembrosPorGrupo.get(g.id) ?? 0} miembros`,
                    g.dia_reunion,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              {reportados.has(g.id) ? <span className={badgeOk}>Reportado</span> : <span className={badgePendiente}>Pendiente</span>}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
