import Link from 'next/link'
import { FiltroBotones, hrefCon, type ParamsReporte } from '@/components/reportes-vistas/Filtros'
import SelectorRed from '@/components/reportes-vistas/SelectorRed'
import VistaGrupo from '@/components/reportes-vistas/VistaGrupo'
import VistaIglesia from '@/components/reportes-vistas/VistaIglesia'
import VistaRed from '@/components/reportes-vistas/VistaRed'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import { requirePerfil } from '@/lib/auth/perfil'
import { construirResumen, PERIODOS, periodoDesdeParam, semanasHasta, type Periodo } from '@/lib/estadisticas'
import { esTipoRed, TIPO_RED_LABEL, TIPOS_RED } from '@/lib/redes'
import { cargarDatosReporte } from '@/lib/reportes/datos'
import { esAdmin } from '@/lib/roles'
import { etiquetaFecha, semanaActual, sumarDias } from '@/lib/semana'
import { createClient } from '@/lib/supabase/server'
import type { Perfil } from '@/lib/types'
import { btnLink, btnPrimary, card } from '@/lib/ui'

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
      {perfil.rol === 'lider_red' && <ReporteLiderRed perfil={perfil} periodo={periodo} semana={semana} />}
      {esAdmin(perfil.rol) && <ReporteIglesia periodo={periodo} semana={semana} sp={sp} />}
    </>
  )
}

const OPCIONES_TIPO = [{ valor: '', label: 'Todas' }, ...TIPOS_RED.map((t) => ({ valor: t, label: TIPO_RED_LABEL[t] }))]

async function ReporteIglesia({ periodo, semana, sp }: { periodo: Periodo; semana: string; sp: SearchParams }) {
  const supabase = await createClient()
  const tipo = esTipoRed(sp.tipo) ? sp.tipo : null
  let consultaRedes = supabase.from('redes').select('id, nombre').eq('activo', true).order('nombre')
  if (tipo) consultaRedes = consultaRedes.eq('tipo', tipo)
  const { data: redes } = await consultaRedes
  const red = (redes ?? []).find((r) => r.id === sp.red) ?? null

  const datos = await cargarDatosReporte(supabase, { periodo, semanaActual: semana, tipo, redId: red?.id })
  const resumen = construirResumen(datos, semana)
  const params = { periodo: String(periodo), tipo: tipo ?? undefined, red: red?.id }

  return (
    <>
      <div className="space-y-3">
        <FiltroPeriodo periodo={periodo} params={params} />
        <FiltroBotones titulo="Tipo de red" param="tipo" opciones={OPCIONES_TIPO} actual={tipo ?? ''} params={{ ...params, red: undefined }} />
        <SelectorRed redes={redes ?? []} actual={red?.id ?? ''} params={params} />
      </div>

      <div className={`${card} p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
        <div>
          <p className="text-sm font-bold text-gray-800">Descargar este reporte</p>
          <p className="text-xs text-gray-500">
            Archivo Excel con los filtros elegidos. Para abrirlo en Google Sheets, súbelo a tu Google Drive y ábrelo con Sheets.
          </p>
        </div>
        <a href={hrefCon(params, {}, '/reportes/descargar')} download className={`${btnPrimary} min-h-11 inline-flex items-center justify-center text-sm`}>
          ⬇ Descargar Excel
        </a>
      </div>

      {red ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-gray-800">{red.nombre}</h3>
            <Link href={hrefCon(params, { red: '' })} className={btnLink}>
              ← Ver toda la iglesia
            </Link>
          </div>
          <VistaRed resumen={resumen} periodo={periodo} esLiderDeLaRed={false} />
        </>
      ) : (
        <VistaIglesia resumen={resumen} periodo={periodo} params={params} mostrarPorTipo={!tipo} />
      )}
    </>
  )
}

async function ReporteLiderRed({ perfil, periodo, semana }: { perfil: Perfil; periodo: Periodo; semana: string }) {
  if (!perfil.red_id) {
    return <EmptyState titulo="Aún no tienes una red asignada." detalle="Pide al líder admin que te asigne una red." />
  }
  const supabase = await createClient()
  const datos = await cargarDatosReporte(supabase, { periodo, semanaActual: semana, redId: perfil.red_id })

  return (
    <>
      <FiltroPeriodo periodo={periodo} params={{ periodo: String(periodo) }} />
      <VistaRed resumen={construirResumen(datos, semana)} periodo={periodo} esLiderDeLaRed />
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
