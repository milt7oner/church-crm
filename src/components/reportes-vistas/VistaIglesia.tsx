import Link from 'next/link'
import EmptyState from '@/components/ui/EmptyState'
import Stat from '@/components/ui/Stat'
import type { Periodo, Resumen } from '@/lib/estadisticas'
import { TIPO_RED_LABEL } from '@/lib/redes'
import { flechaTendencia, frasePeriodo, numero, porcentaje, textoTendencia } from '@/lib/reportes/textos'
import { badgeNeutral, badgePendiente, card } from '@/lib/ui'
import BarrasSemanales from './BarrasSemanales'
import { hrefCon, type ParamsReporte } from './Filtros'

type VistaIglesiaProps = {
  resumen: Resumen
  periodo: Periodo
  params: ParamsReporte
  /** Hide the per-type breakdown when the page is already filtered by type. */
  mostrarPorTipo: boolean
}

/** Church-wide report for the pastor and admin leaders. */
export default function VistaIglesia({ resumen, periodo, params, mostrarPorTipo }: VistaIglesiaProps) {
  if (!resumen.porRed.length) {
    return <EmptyState titulo="No hay redes para mostrar." detalle="Prueba con otro tipo de red o crea redes desde la sección Redes." />
  }

  const tendencia = textoTendencia(resumen.tendencia)
  const contactarPorRed = resumen.porRed.filter((r) => r.paraContactar > 0)

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-700">
        {resumen.actual.promedioSemanal === null ? (
          <>Aún no hay reportes de grupo en {frasePeriodo(periodo)}.</>
        ) : (
          <>
            En {frasePeriodo(periodo)} asistieron en promedio <strong>{numero(resumen.actual.promedioSemanal)} personas</strong> por
            semana a las Casas de Vida{tendencia ? `, ${tendencia}` : ''}.
          </>
        )}{' '}
        Se entregaron <strong>{porcentaje(resumen.cumplimiento.porcentaje)}</strong> de los reportes de grupo.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Asistencia promedio" value={numero(resumen.actual.promedioSemanal)} detalle="personas por semana" />
        <Stat label="Visitantes" value={resumen.actual.visitantes} detalle="en el período" />
        <Stat label="Miembros nuevos" value={resumen.miembrosNuevos} detalle={`de ${resumen.miembrosActivos} activos`} />
        <Stat
          label="Reportes de grupo"
          value={porcentaje(resumen.cumplimiento.porcentaje)}
          detalle={`${resumen.cumplimiento.entregados} de ${resumen.cumplimiento.esperados} entregados`}
        />
      </div>

      <BarrasSemanales titulo="Asistencia semanal" filas={resumen.porSemana} />

      {mostrarPorTipo && resumen.porTipo.length > 1 && (
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-gray-700">Por tipo de red</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {resumen.porTipo.map((t) => (
              <Link key={t.tipo} href={hrefCon(params, { tipo: t.tipo })} className={`${card} p-4 hover:shadow-md transition`}>
                <p className="text-sm font-bold text-gray-800">{TIPO_RED_LABEL[t.tipo]}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{numero(t.promedioSemanal)}</p>
                <p className="text-xs text-gray-500">
                  personas por semana · {t.grupos} grupos · {t.miembros} miembros
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <div>
          <h3 className="text-sm font-bold text-gray-700">Por red</h3>
          <p className="text-xs text-gray-500">Toca una red para ver el detalle de sus grupos.</p>
        </div>
        <ul className={`${card} divide-y divide-gray-100`}>
          {resumen.porRed.map((r) => (
            <li key={r.red.id}>
              <Link href={hrefCon(params, { red: r.red.id })} className="block p-3.5 hover:bg-gray-50 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">{r.red.nombre}</p>
                  <span className={badgeNeutral}>{TIPO_RED_LABEL[r.red.tipo]}</span>
                  {r.paraContactar > 0 && <span className={badgePendiente}>{r.paraContactar} para contactar</span>}
                </div>
                <p className="text-xs text-gray-500">{r.lider ?? 'Sin líder de red'}</p>
                <p className="text-xs text-gray-600">
                  {r.grupos} grupos · {r.miembros} miembros · Promedio {numero(r.promedioSemanal)} {flechaTendencia(r.tendencia)} ·
                  Reportes {porcentaje(r.cumplimiento.porcentaje)} · Seguimiento {porcentaje(r.seguimiento.porcentaje)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-bold text-gray-700">Necesitan atención</h3>
        {!resumen.redesSinLider.length &&
        !resumen.gruposSinLider.length &&
        !resumen.gruposAtrasados.length &&
        !contactarPorRed.length ? (
          <div className={`${card} p-4 text-sm text-[#006C69] font-semibold`}>✓ Todo al día.</div>
        ) : (
          <ul className={`${card} divide-y divide-gray-100 text-sm text-gray-800`}>
            {resumen.redesSinLider.map((r) => (
              <Alerta key={`r-${r.id}`} texto={`${r.nombre}: no tiene líder de red`} detalle="Asígnalo desde Líderes" />
            ))}
            {resumen.gruposSinLider.map((g) => (
              <Alerta key={`g-${g.id}`} texto={`${g.nombre}: no tiene líder de grupo`} detalle="Asígnalo desde Grupos" />
            ))}
            {resumen.gruposAtrasados.slice(0, 10).map((f) => (
              <Alerta
                key={`a-${f.grupo.id}`}
                texto={`${f.grupo.nombre}: ${f.semanasSinReporte} semanas seguidas sin reporte`}
                detalle={`${f.red?.nombre ?? ''} · ${f.lider ?? 'Sin líder'}`}
              />
            ))}
            {resumen.gruposAtrasados.length > 10 && (
              <Alerta texto={`y ${resumen.gruposAtrasados.length - 10} grupos más sin reporte`} detalle="Ver el Excel para la lista completa" />
            )}
            {contactarPorRed.map((r) => (
              <Alerta
                key={`c-${r.red.id}`}
                texto={`${r.red.nombre}: ${r.paraContactar} personas faltaron 2 reuniones seguidas o más`}
                detalle="Toca la red arriba para ver quiénes son"
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Alerta({ texto, detalle }: { texto: string; detalle: string }) {
  return (
    <li className="p-3.5 flex gap-2">
      <span aria-hidden className="text-amber-600">!</span>
      <div>
        <p>{texto}</p>
        <p className="text-xs text-gray-500">{detalle}</p>
      </div>
    </li>
  )
}
