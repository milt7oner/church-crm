import Link from 'next/link'
import { LiderAcciones, NuevoLiderBoton } from '@/components/lideres/LiderBotones'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import { PERFIL_COLUMNS, requirePerfil } from '@/lib/auth/perfil'
import { puedeGestionarLider } from '@/lib/permisos'
import { esRol, ROL_LABEL, rolesQuePuedeCrear, type Rol } from '@/lib/roles'
import { createClient } from '@/lib/supabase/server'
import type { Perfil } from '@/lib/types'
import { badgeNeutral, card } from '@/lib/ui'

export default async function LideresPage({ searchParams }: { searchParams: Promise<{ rol?: string }> }) {
  const perfil = await requirePerfil(['pastor', 'lider_admin', 'lider_red'])
  const { rol: rolParam } = await searchParams
  const filtroRol = esRol(rolParam) ? rolParam : null

  const supabase = await createClient()
  let consultaLideres = supabase.from('perfiles').select(PERFIL_COLUMNS).eq('activo', true).neq('id', perfil.id).order('nombre_completo')
  if (perfil.rol === 'lider_red') consultaLideres = consultaLideres.eq('red_id', perfil.red_id ?? '')
  if (filtroRol) consultaLideres = consultaLideres.eq('rol', filtroRol)

  const [{ data: lideres }, { data: redes }, { data: grupos }] = await Promise.all([
    consultaLideres,
    supabase.from('redes').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('grupos').select('lider_grupo_id').eq('activo', true),
  ])

  const rolesDisponibles = rolesQuePuedeCrear(perfil.rol)
  const opcionesRed = redes ?? []
  const nombreRed = new Map(opcionesRed.map((r) => [r.id, r.nombre]))
  const gruposPorLider = new Map<string, number>()
  ;(grupos ?? []).forEach((g) => {
    if (g.lider_grupo_id) gruposPorLider.set(g.lider_grupo_id, (gruposPorLider.get(g.lider_grupo_id) ?? 0) + 1)
  })
  const comunes = { rolesDisponibles, redes: opcionesRed, redFija: perfil.rol === 'lider_red' ? perfil.red_id : null }
  const filtros: (Rol | null)[] = [null, ...rolesDisponibles]

  return (
    <>
      <PageHeader titulo="Líderes" subtitulo={perfil.rol === 'lider_red' ? 'Líderes de grupo de tu red' : 'Equipo de liderazgo'}>
        {(perfil.rol !== 'lider_red' || perfil.red_id) && <NuevoLiderBoton {...comunes} />}
      </PageHeader>

      {rolesDisponibles.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filtros.map((rol) => (
            <Link
              key={rol ?? 'todos'}
              href={rol ? `/lideres?rol=${rol}` : '/lideres'}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                filtroRol === rol
                  ? 'bg-[#006C69] text-white border-[#006C69]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#006C69]'
              }`}
            >
              {rol ? ROL_LABEL[rol] : 'Todos'}
            </Link>
          ))}
        </div>
      )}

      {!lideres?.length ? (
        <EmptyState titulo="No hay líderes para mostrar." detalle="Usa el botón “Nuevo líder” para agregar uno." />
      ) : (
        <div className={`${card} divide-y divide-gray-100`}>
          {(lideres as Perfil[]).map((lider) => (
            <div key={lider.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-800">{lider.nombre_completo}</p>
                  <span className={badgeNeutral}>{ROL_LABEL[lider.rol]}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {[
                    lider.red_id ? nombreRed.get(lider.red_id) : null,
                    lider.rol === 'lider_grupo' ? `${gruposPorLider.get(lider.id) ?? 0} grupos` : null,
                    lider.email,
                    lider.telefono,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              {puedeGestionarLider(perfil, lider) && <LiderAcciones {...comunes} lider={lider} />}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
