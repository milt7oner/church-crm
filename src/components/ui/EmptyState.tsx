import { card } from '@/lib/ui'

export default function EmptyState({ titulo, detalle }: { titulo: string; detalle?: string }) {
  return (
    <div className={`${card} p-8 text-center space-y-1`}>
      <p className="text-sm text-gray-500">{titulo}</p>
      {detalle && <p className="text-xs text-gray-400">{detalle}</p>}
    </div>
  )
}
