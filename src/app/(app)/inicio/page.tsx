import Link from 'next/link'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import Stat from '@/components/ui/Stat'
import { requirePerfil } from '@/lib/auth/perfil'
import { esAdmin } from '@/lib/roles'
import { etiquetaSemana, semanaActual } from '@/lib/semana'
import { createClient } from '@/lib/supabase/server'
import type { Perfil } from '@/lib/types'
import { badgeOk, badgePendiente, btnPrimary, card } from '@/lib/ui'

type GrupoResumen = { id: string; nombre: string; red_id: string; lider_grupo_id: string | null }

export default async function InicioPage() {
  const perfil = await requirePerfil()
  const semana = semanaActual()

  return (
    <>
      <PageHeader titulo={`Hola, ${perfil.nombre_completo.split(' ')[0]}`} subtitulo={`Semana del ${etiquetaSemana(semana)}`} />
      {esAdmin(perfil.rol) && <InicioAdmin semana={semana} />}
      {perfil.rol === 'lider_red' && <InicioLiderRed perfil={perfil} semana={semana} />}
      {perfil.rol === 'lider_grupo' && <InicioLiderGrupo perfil={perfil} semana={semana} />}
    </>
  )
}

function EstadoReporte({ entregado }: { entregado: boolean }) {
  return entregado ? <span className={badgeOk}>Reportado</span> : <span className={badgePendiente}>Pendiente</span>
}

async function InicioAdmin({ semana }: { semana: string }) {
  const supabase = await createClient()
  const [{ data: redes }, { data: grupos }, { data: lideresRed }, { data: reportes }, { data: reportesRed }, { count: totalMiembros }] =
    await Promise.all([
      supabase.from('redes').select('id, nombre').eq('activo', true).order('nombre'),
      supabase.from('grupos').select('id, nombre, red_id, lider_grupo_id').eq('activo', true),
      supabase.from('perfiles').select('nombre_completo, red_id').eq('rol', 'lider_red').eq('activo', true),
      supabase.from('reportes_grupo').select('grupo_id').eq('semana', semana),
      supabase.from('reportes_red').select('red_id').eq('semana', semana),
      supabase.from('miembros').select('id', { count: 'exact', head: true }).eq('activo', true),
    ])

  const gruposActivos = (grupos ?? []) as GrupoResumen[]
  const reportados = new Set((reportes ?? []).map((r) => r.grupo_id))
  const redesReportadas = new Set((reportesRed ?? []).map((r) => r.red_id))
  const liderPorRed = new Map((lideresRed ?? []).map((l) => [l.red_id, l.nombre_completo]))
  const totalReportados = gruposActivos.filter((g) => reportados.has(g.id)).length

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Redes" value={redes?.length ?? 0} />
        <Stat label="Grupos" value={gruposActivos.length} />
        <Stat label="Miembros" value={totalMiembros ?? 0} />
        <Stat label="Reportes semana" value={`${totalReportados}/${gruposActivos.length}`} />
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-gray-700">Estado por red</h3>
        {!redes?.length ? (
          <EmptyState titulo="Aún no hay redes creadas." detalle="Créalas desde la sección Redes." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {redes.map((red) => {
              const gruposRed = gruposActivos.filter((g) => g.red_id === red.id)
              const reportadosRed = gruposRed.filter((g) => reportados.has(g.id)).length
              return (
                <Link key={red.id} href={`/redes/${red.id}`} className={`${card} p-4 hover:shadow-md transition space-y-2`}>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{red.nombre}</p>
                      <p className="text-xs text-gray-500">{liderPorRed.get(red.id) ?? 'Sin líder de red'}</p>
                    </div>
                    <EstadoReporte entregado={redesReportadas.has(red.id)} />
                  </div>
                  <p className="text-xs text-gray-600">
                    Grupos reportados: <strong>{reportadosRed}/{gruposRed.length}</strong>
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

async function InicioLiderRed({ perfil, semana }: { perfil: Perfil; semana: string }) {
  if (!perfil.red_id) {
    return <EmptyState titulo="Aún no tienes una red asignada." detalle="Pide al líder admin que te asigne una red." />
  }

  const supabase = await createClient()
  const [{ data: red }, { data: grupos }, { data: lideres }, { data: reportes }, { data: reporteRed }] = await Promise.all([
    supabase.from('redes').select('id, nombre').eq('id', perfil.red_id).maybeSingle(),
    supabase.from('grupos').select('id, nombre, red_id, lider_grupo_id').eq('red_id', perfil.red_id).eq('activo', true).order('nombre'),
    supabase.from('perfiles').select('id, nombre_completo').eq('red_id', perfil.red_id),
    supabase.from('reportes_grupo').select('grupo_id').eq('semana', semana),
    supabase.from('reportes_red').select('id').eq('red_id', perfil.red_id).eq('semana', semana).maybeSingle(),
  ])

  const reportados = new Set((reportes ?? []).map((r) => r.grupo_id))
  const nombreLider = new Map((lideres ?? []).map((l) => [l.id, l.nombre_completo]))
  const gruposRed = (grupos ?? []) as GrupoResumen[]

  return (
    <>
      <div className={`${card} p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Reporte de red</p>
          <p className="font-bold text-gray-800 text-sm mt-0.5">{red?.nombre}</p>
          <div className="mt-1">
            <EstadoReporte entregado={Boolean(reporteRed)} />
          </div>
        </div>
        <Link href={`/redes/${perfil.red_id}/reporte`} className={`${btnPrimary} text-center`}>
          {reporteRed ? 'Editar reporte' : 'Llenar reporte de esta semana'}
        </Link>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-gray-700">
          Grupos de tu red ({gruposRed.filter((g) => reportados.has(g.id)).length}/{gruposRed.length} reportados)
        </h3>
        {!gruposRed.length ? (
          <EmptyState titulo="Tu red aún no tiene grupos." detalle="Créalos desde la sección Grupos." />
        ) : (
          <div className={`${card} divide-y divide-gray-100`}>
            {gruposRed.map((g) => (
              <Link key={g.id} href={`/grupos/${g.id}`} className="flex items-center justify-between gap-3 p-3.5 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{g.nombre}</p>
                  <p className="text-xs text-gray-500">{g.lider_grupo_id ? nombreLider.get(g.lider_grupo_id) : 'Sin líder'}</p>
                </div>
                <EstadoReporte entregado={reportados.has(g.id)} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

async function InicioLiderGrupo({ perfil, semana }: { perfil: Perfil; semana: string }) {
  const supabase = await createClient()
  const { data: grupos } = await supabase
    .from('grupos')
    .select('id, nombre, direccion, dia_reunion, hora_reunion')
    .eq('lider_grupo_id', perfil.id)
    .eq('activo', true)
    .order('nombre')

  const ids = (grupos ?? []).map((g) => g.id)
  const [{ data: miembros }, { data: reportes }] = ids.length
    ? await Promise.all([
        supabase.from('miembros').select('grupo_id').in('grupo_id', ids).eq('activo', true),
        supabase.from('reportes_grupo').select('grupo_id').in('grupo_id', ids).eq('semana', semana),
      ])
    : [{ data: [] }, { data: [] }]

  const reportados = new Set((reportes ?? []).map((r) => r.grupo_id))
  const miembrosPorGrupo = new Map<string, number>()
  ;(miembros ?? []).forEach((m) => miembrosPorGrupo.set(m.grupo_id, (miembrosPorGrupo.get(m.grupo_id) ?? 0) + 1))

  if (!grupos?.length) {
    return <EmptyState titulo="Aún no tienes grupos asignados." detalle="Tu líder de red te asignará tus grupos." />
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {grupos.map((g) => (
        <div key={g.id} className={`${card} p-4 space-y-3`}>
          <div className="flex justify-between items-start gap-2">
            <Link href={`/grupos/${g.id}`} className="font-bold text-gray-800 text-sm hover:text-[#006C69]">
              {g.nombre}
            </Link>
            <EstadoReporte entregado={reportados.has(g.id)} />
          </div>
          <p className="text-xs text-gray-500">
            {miembrosPorGrupo.get(g.id) ?? 0} miembros
            {g.dia_reunion && ` · ${g.dia_reunion}`}
            {g.hora_reunion && ` ${g.hora_reunion.slice(0, 5)}`}
          </p>
          <Link href={`/grupos/${g.id}/reporte`} className={`${btnPrimary} block text-center`}>
            {reportados.has(g.id) ? 'Editar reporte de esta semana' : 'Llenar reporte de esta semana'}
          </Link>
        </div>
      ))}
    </div>
  )
}
