import { FiltroBotones, type ParamsReporte } from '@/components/reportes-vistas/Filtros'
import VistaGrupo from '@/components/reportes-vistas/VistaGrupo'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import { requirePerfil } from '@/lib/auth/perfil'
import { construirResumen, PERIODOS, periodoDesdeParam, semanasHasta, type Periodo } from '@/lib/estadisticas'
import { cargarDatosReporte } from '@/lib/reportes/datos'
import { etiquetaFecha, semanaActual, sumarDias } from '@/lib/semana'
import { createClient } from '@/lib/supabase/server'
import type { Perfil } from '@/lib/types'

type SearchParams = { periodo?: string; grupo?: string; red?: string; tipo?: string }

export default async function ReportesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const perfil = await requirePerfil()
  const sp = await searchParams
  const periodo = periodoDesdeParam(sp.periodo)
  const semana = semanaActual()
  const semanas = semanasHasta(semana, periodo)
  const rango = `Del ${etiquetaFecha(semanas[0])} al ${etiquetaFecha(sumarDias(semana, 6))}`

  return (
    <>
      <PageHeader titulo="Reportes" subtitulo={rango} />
      {perfil.rol === 'lider_grupo' && <ReporteLiderGrupo perfil={perfil} periodo={periodo} semana={semana} sp={sp} />}
    </>
  )
}

function FiltroPeriodo({ periodo, params }: { periodo: Periodo; params: ParamsReporte }) {
  return (
    <FiltroBotones
      titulo="Período"
      param="periodo"
      opciones={PERIODOS.map((p) => ({ valor: String(p.semanas), label: p.label }))}
      actual={String(periodo)}
      params={params}
    />
  )
}

async function ReporteLiderGrupo({ perfil, periodo, semana, sp }: { perfil: Perfil; periodo: Periodo; semana: string; sp: SearchParams }) {
  const supabase = await createClient()
  const { data: misGrupos } = await supabase
    .from('grupos')
    .select('id, nombre')
    .eq('lider_grupo_id', perfil.id)
    .eq('activo', true)
    .order('nombre')
  if (!misGrupos?.length) {
    return <EmptyState titulo="Aún no tienes grupos asignados." detalle="Pide a tu líder de red que te asigne uno." />
  }

  const grupoId = misGrupos.some((g) => g.id === sp.grupo) ? sp.grupo! : misGrupos[0].id
  const datos = await cargarDatosReporte(supabase, { periodo, semanaActual: semana, grupoId })
  const params = { periodo: String(periodo), grupo: grupoId }

  return (
    <>
      <div className="space-y-3">
        {misGrupos.length > 1 && (
          <FiltroBotones
            titulo="Grupo"
            param="grupo"
            opciones={misGrupos.map((g) => ({ valor: g.id, label: g.nombre }))}
            actual={grupoId}
            params={params}
          />
        )}
        <FiltroPeriodo periodo={periodo} params={params} />
      </div>
      <VistaGrupo resumen={construirResumen(datos, semana)} datos={datos} periodo={periodo} />
    </>
  )
}
