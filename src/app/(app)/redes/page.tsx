import Link from 'next/link'
import { NuevaRedBoton, RedAcciones } from '@/components/redes/RedBotones'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import { requirePerfil } from '@/lib/auth/perfil'
import { TIPO_RED_LABEL, type TipoRed } from '@/lib/redes'
import { createClient } from '@/lib/supabase/server'
import { badgeNeutral, card } from '@/lib/ui'

export default async function RedesPage() {
  await requirePerfil(['pastor', 'lider_admin'])

  const supabase = await createClient()
  const [{ data: redes }, { data: lideres }, { data: grupos }] = await Promise.all([
    supabase.from('redes').select('id, nombre, tipo, descripcion').eq('activo', true).order('nombre'),
    supabase.from('perfiles').select('nombre_completo, red_id').eq('rol', 'lider_red').eq('activo', true),
    supabase.from('grupos').select('red_id').eq('activo', true),
  ])

  const liderPorRed = new Map((lideres ?? []).map((l) => [l.red_id, l.nombre_completo]))
  const gruposPorRed = new Map<string, number>()
  ;(grupos ?? []).forEach((g) => gruposPorRed.set(g.red_id, (gruposPorRed.get(g.red_id) ?? 0) + 1))

  return (
    <>
      <PageHeader titulo="Redes" subtitulo="El líder de cada red se asigna desde Líderes">
        <NuevaRedBoton />
      </PageHeader>

      {!redes?.length ? (
        <EmptyState titulo="Aún no hay redes." detalle="Crea la primera red para empezar a organizar los grupos." />
      ) : (
        <div className={`${card} divide-y divide-gray-100`}>
          {redes.map((red) => (
            <div key={red.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <Link href={`/redes/${red.id}`} className="min-w-0 group">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-[#006C69]">{red.nombre}</p>
                  <span className={badgeNeutral}>{TIPO_RED_LABEL[red.tipo as TipoRed]}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {liderPorRed.get(red.id) ?? 'Sin líder de red'} · {gruposPorRed.get(red.id) ?? 0} grupos
                </p>
                {red.descripcion && <p className="text-xs text-gray-400 truncate">{red.descripcion}</p>}
              </Link>
              <RedAcciones red={red} />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
