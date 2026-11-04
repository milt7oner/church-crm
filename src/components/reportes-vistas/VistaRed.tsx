import Link from 'next/link'
import EmptyState from '@/components/ui/EmptyState'
import Stat from '@/components/ui/Stat'
import type { FilaGrupo, Periodo, Resumen } from '@/lib/estadisticas'
import { etiquetaCorta, flechaTendencia, frasePeriodo, numero, porcentaje, textoTendencia } from '@/lib/reportes/textos'
import { badgeOk, badgePendiente, card } from '@/lib/ui'
import BarrasSemanales from './BarrasSemanales'
import PersonasContactar from './PersonasContactar'

type VistaRedProps = {
  resumen: Resumen
  periodo: Periodo
  /** True for the network's own leader ("Mi seguimiento"); false when the pastor or an admin looks at it. */
  esLiderDeLaRed: boolean
}

/** Report of one network: for its leader, and for the pastor/admins when they open a network. */
export default function VistaRed({ resumen, periodo, esLiderDeLaRed }: VistaRedProps) {
  if (!resumen.porGrupo.length) {
    return <EmptyState titulo="Esta red aún no tiene grupos activos." detalle="Cuando tenga grupos y reportes, aquí verás cómo va." />
  }

  const tendencia = textoTendencia(resumen.tendencia)
  const sinSeguimiento = resumen.porGrupo.filter((f) => !f.ultimoSeguimiento || f.ultimoSeguimiento < resumen.semanas[0])
  const nombreGrupo = new Map(resumen.porGrupo.map((f) => [f.grupo.id, f.grupo.nombre]))

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-700">
        {resumen.actual.promedioSemanal === null ? (
          <>Aún no hay reportes de grupo en {frasePeriodo(periodo)}.</>
        ) : (
          <>
            En {frasePeriodo(periodo)} la red tuvo en promedio <strong>{numero(resumen.actual.promedioSemanal)} personas</strong> por
            semana{tendencia ? `, ${tendencia}` : ''}.
          </>
        )}{' '}
        Se entregaron <strong>{porcentaje(resumen.cumplimiento.porcentaje)}</strong> de los reportes de grupo.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Asistencia promedio" value={numero(resumen.actual.promedioSemanal)} detalle="personas por semana" />
        <Stat label="Visitantes" value={resumen.actual.visitantes} detalle="en el período" />
        <Stat
          label="Reportes de grupo"
          value={porcentaje(resumen.cumplimiento.porcentaje)}
          detalle={`${resumen.cumplimiento.entregados} de ${resumen.cumplimiento.esperados} entregados`}
        />
        <Stat
          label={esLiderDeLaRed ? 'Mi seguimiento' : 'Seguimiento del líder'}
          value={`${resumen.seguimiento.conSeguimiento} de ${resumen.seguimiento.total}`}
          detalle="grupos visitados"
        />
      </div>

      <BarrasSemanales titulo="Asistencia semanal de la red" filas={resumen.porSemana} />

      <NecesitanAtencion atrasados={resumen.gruposAtrasados} sinSeguimiento={sinSeguimiento} sinLider={resumen.gruposSinLider.length} />

      <PersonasContactar personas={resumen.paraContactar} nombreGrupo={nombreGrupo} />

      <section className="space-y-2">
        <h3 className="text-sm font-bold text-gray-700">{esLiderDeLaRed ? 'Mis grupos' : 'Grupos de la red'}</h3>
        <ul className={`${card} divide-y divide-gray-100`}>
          {resumen.porGrupo.map((f) => (
            <li key={f.grupo.id}>
              <Link href={`/grupos/${f.grupo.id}`} className="block p-3.5 hover:bg-gray-50 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800">{f.grupo.nombre}</p>
                  {f.semanasSinReporte >= 2 ? (
                    <span className={badgePendiente}>{f.semanasSinReporte} semanas sin reporte</span>
                  ) : (
                    <span className={badgeOk}>Al día</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{f.lider ?? 'Sin líder'}</p>
                <p className="text-xs text-gray-600">
                  Reportes {f.cumplimiento.entregados}/{f.cumplimiento.esperados} · Promedio {numero(f.promedio)}{' '}
                  {flechaTendencia(f.tendencia)} · Seguimiento: {f.ultimoSeguimiento ? etiquetaCorta(f.ultimoSeguimiento) : 'ninguno'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function NecesitanAtencion({
  atrasados,
  sinSeguimiento,
  sinLider,
}: {
  atrasados: FilaGrupo[]
  sinSeguimiento: FilaGrupo[]
  sinLider: number
}) {
  const items = [
    ...atrasados.map((f) => ({
      key: `a-${f.grupo.id}`,
      texto: `${f.grupo.nombre}: ${f.semanasSinReporte} semanas seguidas sin reporte`,
      detalle: f.lider ?? 'Sin líder',
    })),
    ...sinSeguimiento.map((f) => ({
      key: `s-${f.grupo.id}`,
      texto: `${f.grupo.nombre}: sin seguimiento del líder de red en este período`,
      detalle: f.lider ?? 'Sin líder',
    })),
    ...(sinLider ? [{ key: 'sin-lider', texto: `${sinLider} grupo(s) sin líder asignado`, detalle: 'Asígnalo desde Grupos' }] : []),
  ]

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-bold text-gray-700">Necesitan atención ({items.length})</h3>
      {!items.length ? (
        <div className={`${card} p-4 text-sm text-[#006C69] font-semibold`}>✓ Todo al día.</div>
      ) : (
        <ul className={`${card} divide-y divide-gray-100`}>
          {items.map((i) => (
            <li key={i.key} className="p-3.5 flex gap-2">
              <span aria-hidden className="text-amber-600">!</span>
              <div>
                <p className="text-sm text-gray-800">{i.texto}</p>
                <p className="text-xs text-gray-500">{i.detalle}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
