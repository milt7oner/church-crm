import Link from 'next/link'

export type ParamsReporte = Record<string, string | undefined>

/** Same page with one search param changed (empty value removes it). */
export function hrefCon(params: ParamsReporte, cambio: ParamsReporte, base = '/reportes'): string {
  const query = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...params, ...cambio })) if (v) query.set(k, v)
  const texto = query.toString()
  return texto ? `${base}?${texto}` : base
}

type FiltroBotonesProps = {
  titulo: string
  param: string
  opciones: { valor: string; label: string }[]
  actual: string
  params: ParamsReporte
}

/** Large tappable chips; each one is a plain link so it works without JavaScript. */
export function FiltroBotones({ titulo, param, opciones, actual, params }: FiltroBotonesProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{titulo}</p>
      <div className="flex flex-wrap gap-2">
        {opciones.map((o) => {
          const activo = o.valor === actual
          return (
            <Link
              key={o.valor || 'todos'}
              href={hrefCon(params, { [param]: o.valor })}
              aria-current={activo ? 'true' : undefined}
              className={`min-h-11 inline-flex items-center rounded-xl border px-4 text-sm font-semibold transition-colors ${
                activo
                  ? 'border-[#006C69] bg-[#006C69] text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-[#006C69]/40'
              }`}
            >
              {o.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
