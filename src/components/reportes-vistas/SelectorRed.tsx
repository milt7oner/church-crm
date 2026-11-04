'use client'

import { useRouter } from 'next/navigation'
import { input } from '@/lib/ui'
import { hrefCon, type ParamsReporte } from './Filtros'

type SelectorRedProps = { redes: { id: string; nombre: string }[]; actual: string; params: ParamsReporte }

export default function SelectorRed({ redes, actual, params }: SelectorRedProps) {
  const router = useRouter()
  return (
    <div className="space-y-1.5">
      <label htmlFor="filtro-red" className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
        Red
      </label>
      <select
        id="filtro-red"
        value={actual}
        onChange={(e) => router.push(hrefCon(params, { red: e.target.value }))}
        className={`${input} min-h-11 sm:w-72`}
      >
        <option value="">Todas las redes</option>
        {redes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.nombre}
          </option>
        ))}
      </select>
    </div>
  )
}
