import { card } from '@/lib/ui'

type StatProps = {
  label: string
  value: React.ReactNode
  /** Short plain-language line under the number. */
  detalle?: React.ReactNode
}

export default function Stat({ label, value, detalle }: StatProps) {
  return (
    <div className={`${card} p-4`}>
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      {detalle && <p className="text-xs text-gray-500 mt-0.5">{detalle}</p>}
    </div>
  )
}
