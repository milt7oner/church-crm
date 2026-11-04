import type { AsistenciaPersona } from '@/lib/estadisticas'
import { enlaceLlamada, enlaceWhatsapp } from '@/lib/reportes/textos'
import { card } from '@/lib/ui'

const btnAccion = 'min-h-11 inline-flex items-center justify-center gap-1 rounded-xl border px-3 text-xs font-bold transition-colors'

type PersonasContactarProps = {
  personas: AsistenciaPersona[]
  /** Group name per group id, shown when the list mixes several groups. */
  nombreGrupo?: Map<string, string>
}

export default function PersonasContactar({ personas, nombreGrupo }: PersonasContactarProps) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-bold text-gray-700">Personas para contactar ({personas.length})</h3>
        <p className="text-xs text-gray-500">Faltaron a las 2 últimas reuniones o más. Una llamada o un mensaje hace la diferencia.</p>
      </div>
      {!personas.length ? (
        <div className={`${card} p-4 text-sm text-[#006C69] font-semibold`}>✓ Nadie ha faltado dos reuniones seguidas.</div>
      ) : (
        <ul className={`${card} divide-y divide-gray-100`}>
          {personas.map((p) => {
            const llamar = enlaceLlamada(p.miembro.telefono)
            const whatsapp = enlaceWhatsapp(p.miembro.telefono)
            return (
              <li key={p.miembro.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{p.miembro.nombre_completo}</p>
                  <p className="text-xs text-amber-700">
                    Faltó {p.faltasSeguidas} reuniones seguidas
                    {nombreGrupo && <span className="text-gray-500"> · {nombreGrupo.get(p.miembro.grupo_id)}</span>}
                  </p>
                </div>
                {llamar || whatsapp ? (
                  <div className="flex gap-2">
                    {llamar && (
                      <a href={llamar} className={`${btnAccion} border-gray-200 bg-white text-gray-700 hover:border-[#006C69]/40`}>
                        📞 Llamar
                      </a>
                    )}
                    {whatsapp && (
                      <a
                        href={whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${btnAccion} border-[#006C69] bg-[#006C69] text-white hover:bg-[#005250]`}
                      >
                        💬 WhatsApp
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Sin teléfono registrado</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
