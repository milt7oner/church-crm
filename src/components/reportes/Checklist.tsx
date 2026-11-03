'use client'

type Item = { id: string; titulo: string; detalle?: string | null }

type ChecklistProps = {
  items: Item[]
  seleccion: Set<string>
  onChange: (seleccion: Set<string>) => void
  resumen: (marcados: number, total: number) => string
}

/** Large tap targets for marking people or groups on a phone. */
export default function Checklist({ items, seleccion, onChange, resumen }: ChecklistProps) {
  const todos = items.length > 0 && items.every((i) => seleccion.has(i.id))

  const toggle = (id: string) => {
    const next = new Set(seleccion)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700">{resumen(items.filter((i) => seleccion.has(i.id)).length, items.length)}</p>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(todos ? new Set() : new Set(items.map((i) => i.id)))}
            className="text-xs font-semibold text-[#006C69] hover:underline"
          >
            {todos ? 'Desmarcar todos' : 'Marcar todos'}
          </button>
        )}
      </div>
      <ul className="border border-gray-200 rounded-2xl divide-y divide-gray-100 bg-white overflow-hidden">
        {items.map((item) => {
          const marcado = seleccion.has(item.id)
          return (
            <li key={item.id}>
              <label className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer transition ${marcado ? 'bg-[#006C69]/5' : ''}`}>
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => toggle(item.id)}
                  className="h-5 w-5 accent-[#006C69] shrink-0"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-800">{item.titulo}</span>
                  {item.detalle && <span className="block text-xs text-gray-500 truncate">{item.detalle}</span>}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
