import Link from 'next/link'
import EmptyState from '@/components/ui/EmptyState'
import Stat from '@/components/ui/Stat'
import { ordenarPorAsistencia, type AsistenciaPersona, type DatosReporte, type Periodo, type Resumen } from '@/lib/estadisticas'
import { etiquetaCorta, frasePeriodo, numero, porcentaje, textoTendencia } from '@/lib/reportes/textos'
import { etiquetaFecha, etiquetaSemana } from '@/lib/semana'
import { btnPrimary, card } from '@/lib/ui'
import BarrasSemanales from './BarrasSemanales'
import PersonasContactar from './PersonasContactar'

type VistaGrupoProps = { resumen: Resumen; datos: DatosReporte; periodo: Periodo }

/** Report of a single group, for its own leader. */
export default function VistaGrupo({ resumen, datos, periodo }: VistaGrupoProps) {
  const fila = resumen.porGrupo[0]
  if (!fila) return <EmptyState titulo="No encontramos este grupo." />

  const temas = datos.reportesGrupo
    .filter((r) => resumen.semanas.includes(r.semana))
    .sort((a, b) => b.semana.localeCompare(a.semana))

  if (!temas.length) {
    return (
      <div className={`${card} p-6 text-center space-y-3`}>
        <p className="text-sm text-gray-700">
          Aún no hay reportes en {frasePeriodo(periodo)}. Cuando llenes el reporte semanal, aquí verás cómo va tu grupo.
        </p>
        <Link href={`/grupos/${fila.grupo.id}/reporte`} className={`${btnPrimary} inline-block`}>
          Llenar reporte de esta semana
        </Link>
      </div>
    )
  }

  const tendencia = textoTendencia(fila.tendencia)

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-700">
        En {frasePeriodo(periodo)} tu grupo tuvo en promedio <strong>{numero(fila.promedio)} personas</strong> por reunión
        {tendencia ? `, ${tendencia}` : ''}.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Asistencia promedio" value={numero(fila.promedio)} detalle="personas por reunión" />
        <Stat label="Visitantes" value={fila.visitantes} detalle="en total en el período" />
        <Stat
          label="Reportes enviados"
          value={`${fila.cumplimiento.entregados} de ${fila.cumplimiento.esperados}`}
          detalle={fila.cumplimiento.porcentaje === 100 ? '¡Al día!' : 'semanas del período'}
        />
      </div>

      <BarrasSemanales titulo="Asistencia por semana" filas={resumen.porSemana} />

      <PersonasContactar personas={resumen.paraContactar} />

      <AsistenciaPorPersona personas={ordenarPorAsistencia(resumen.personas)} />

      <section className="space-y-2">
        <h3 className="text-sm font-bold text-gray-700">Temas dados</h3>
        <ul className={`${card} divide-y divide-gray-100`}>
          {temas.map((r) => (
            <li key={r.semana} className="p-3.5">
              <p className="text-sm font-semibold text-gray-800">{r.tema || 'Sin tema registrado'}</p>
              <p className="text-xs text-gray-500">
                {r.fecha_reunion ? etiquetaFecha(r.fecha_reunion) : `Semana ${etiquetaSemana(r.semana)}`}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

const MARCA = {
  asistio: { simbolo: '●', clase: 'text-[#006C69]', texto: 'asistió' },
  falto: { simbolo: '○', clase: 'text-amber-600', texto: 'faltó' },
  'sin-reporte': { simbolo: '–', clase: 'text-gray-300', texto: 'sin reporte' },
} as const

export function AsistenciaPorPersona({ personas }: { personas: AsistenciaPersona[] }) {
  if (!personas.length) return null
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-bold text-gray-700">Asistencia por persona</h3>
        <p className="text-xs text-gray-500">
          <span className="text-[#006C69]">●</span> asistió · <span className="text-amber-600">○</span> faltó ·{' '}
          <span className="text-gray-400">–</span> sin reporte. Primero quienes menos han venido.
        </p>
      </div>
      <ul className={`${card} divide-y divide-gray-100`}>
        {personas.map((p) => (
          <li key={p.miembro.id} className="p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{p.miembro.nombre_completo}</p>
              <p className="text-base tracking-[0.2em] leading-none mt-1" aria-hidden>
                {p.marcas.slice(-13).map((m) => (
                  <span key={m.semana} className={MARCA[m.marca].clase} title={`${etiquetaCorta(m.semana)}: ${MARCA[m.marca].texto}`}>
                    {MARCA[m.marca].simbolo}
                  </span>
                ))}
              </p>
              <p className="sr-only">
                Asistió {p.asistio} y faltó {p.falto} veces
              </p>
            </div>
            <span className={`text-sm font-bold shrink-0 ${p.porcentaje !== null && p.porcentaje < 50 ? 'text-amber-700' : 'text-gray-700'}`}>
              {porcentaje(p.porcentaje)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
