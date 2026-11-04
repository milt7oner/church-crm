import type { SemanaAsistencia } from '@/lib/estadisticas'
import { etiquetaCorta } from '@/lib/reportes/textos'
import { etiquetaSemana } from '@/lib/semana'
import { card } from '@/lib/ui'

/** One bar per week: members (solid) + visitors (light), number on top. */
export default function BarrasSemanales({ titulo, filas }: { titulo: string; filas: SemanaAsistencia[] }) {
  const maximo = Math.max(1, ...filas.map((f) => f.miembros + f.visitantes))
  const cadaCuanto = Math.ceil(filas.length / 8) // keep week labels readable on a phone
  const hayVisitantes = filas.some((f) => f.visitantes > 0)

  return (
    <section className={`${card} p-4 space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-700">{titulo}</h3>
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#006C69]" /> Miembros
          </span>
          {hayVisitantes && (
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#006C69]/35" /> Visitantes
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <ul className="flex items-end gap-1.5" style={{ minWidth: `${filas.length * 26}px` }}>
          {filas.map((f, i) => {
            const total = f.miembros + f.visitantes
            const sinReporte = f.reportes === 0
            return (
              <li key={f.semana} className="flex-1 min-w-[20px] flex flex-col items-center gap-1">
                <span className={`text-[11px] font-bold ${sinReporte ? 'text-gray-300' : 'text-gray-700'}`}>
                  {sinReporte ? '–' : total}
                </span>
                <div className="relative h-32 w-full flex flex-col justify-end">
                  {sinReporte ? (
                    <div className="h-1 w-full rounded bg-gray-100" />
                  ) : (
                    <div className="w-full flex flex-col justify-end" style={{ height: `${(total / maximo) * 100}%` }}>
                      {f.visitantes > 0 && <div className="w-full rounded-t-md bg-[#006C69]/35" style={{ flexGrow: f.visitantes }} />}
                      <div
                        className={`w-full bg-[#006C69] ${f.visitantes > 0 ? '' : 'rounded-t-md'}`}
                        style={{ flexGrow: Math.max(f.miembros, total === 0 ? 1 : 0), minHeight: total === 0 ? 0 : 2 }}
                      />
                    </div>
                  )}
                </div>
                <span className={`text-[10px] text-gray-500 whitespace-nowrap ${i % cadaCuanto ? 'invisible' : ''}`}>
                  {etiquetaCorta(f.semana)}
                </span>
                <span className="sr-only">
                  {`Semana ${etiquetaSemana(f.semana)}: ${sinReporte ? 'sin reporte' : `${f.miembros} miembros y ${f.visitantes} visitantes`}`}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
      <p className="text-[11px] text-gray-400">“–” = semana sin reporte</p>
    </section>
  )
}
