'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { guardarReporteRed } from '@/app/actions/reportes-actions'
import { useActionForm } from '@/components/ui/useActionForm'
import { alertError, btnPrimary, btnSecondary, card, input, label } from '@/lib/ui'
import Checklist from './Checklist'

type ReporteRedFormProps = {
  redId: string
  semana: string
  grupos: { id: string; nombre: string; detalle: string }[]
  inicial: { novedades: string; gruposIds: string[] }
}

export default function ReporteRedForm({ redId, semana, grupos, inicial }: ReporteRedFormProps) {
  const router = useRouter()
  const [seleccion, setSeleccion] = useState(new Set(inicial.gruposIds))
  const [novedades, setNovedades] = useState(inicial.novedades)
  const { pending, error, run } = useActionForm(() => router.push(`/redes/${redId}`))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(() => guardarReporteRed({ redId, semana, novedades, gruposIds: [...seleccion] }))
      }}
      className="space-y-5"
    >
      {error && <div className={alertError}>{error}</div>}

      <section className="space-y-2">
        <h3 className="text-sm font-bold text-gray-700">¿A qué grupos les hiciste seguimiento?</h3>
        {grupos.length ? (
          <Checklist
            items={grupos.map((g) => ({ id: g.id, titulo: g.nombre, detalle: g.detalle }))}
            seleccion={seleccion}
            onChange={setSeleccion}
            resumen={(marcados, total) => `Seguimiento a ${marcados} de ${total} grupos`}
          />
        ) : (
          <p className="text-xs text-gray-500">Tu red aún no tiene grupos activos.</p>
        )}
      </section>

      <section className={`${card} p-4`}>
        <label className={label}>Novedades</label>
        <textarea
          rows={4}
          value={novedades}
          onChange={(e) => setNovedades(e.target.value)}
          className={input}
          placeholder="Situaciones de los grupos, necesidades de los líderes, testimonios..."
        />
      </section>

      <div className="flex gap-2">
        <button type="button" onClick={() => router.back()} className={`${btnSecondary} flex-1 sm:flex-none`}>
          Cancelar
        </button>
        <button type="submit" disabled={pending} className={`${btnPrimary} flex-1 sm:flex-none`}>
          {pending ? 'Guardando...' : 'Guardar reporte'}
        </button>
      </div>
    </form>
  )
}
