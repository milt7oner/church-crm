'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { guardarReporteGrupo } from '@/app/actions/reportes-actions'
import { useActionForm } from '@/components/ui/useActionForm'
import { alertError, btnPrimary, btnSecondary, card, input, label } from '@/lib/ui'
import Checklist from './Checklist'

type ReporteGrupoFormProps = {
  grupoId: string
  semana: string
  fechaMin: string
  fechaMax: string
  miembros: { id: string; nombre_completo: string; telefono: string | null }[]
  inicial: { fechaReunion: string; tema: string; novedades: string; asistentes: string[] }
}

export default function ReporteGrupoForm({ grupoId, semana, fechaMin, fechaMax, miembros, inicial }: ReporteGrupoFormProps) {
  const router = useRouter()
  const [asistentes, setAsistentes] = useState(new Set(inicial.asistentes))
  const [form, setForm] = useState({ fechaReunion: inicial.fechaReunion, tema: inicial.tema, novedades: inicial.novedades })
  const { pending, error, run } = useActionForm(() => router.push(`/grupos/${grupoId}`))

  const set = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [campo]: e.target.value })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(() => guardarReporteGrupo({ grupoId, semana, ...form, asistentes: [...asistentes] }))
      }}
      className="space-y-5"
    >
      {error && <div className={alertError}>{error}</div>}

      <section className="space-y-2">
        <h3 className="text-sm font-bold text-gray-700">¿Quiénes asistieron?</h3>
        {miembros.length ? (
          <Checklist
            items={miembros.map((m) => ({ id: m.id, titulo: m.nombre_completo, detalle: m.telefono }))}
            seleccion={asistentes}
            onChange={setAsistentes}
            resumen={(marcados, total) => `${marcados} de ${total} asistieron`}
          />
        ) : (
          <p className="text-xs text-gray-500">Este grupo no tiene miembros registrados. Agrégalos desde la página del grupo.</p>
        )}
      </section>

      <section className={`${card} p-4 space-y-3`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label}>Fecha de la reunión</label>
            <input type="date" value={form.fechaReunion} min={fechaMin} max={fechaMax} onChange={set('fechaReunion')} className={input} />
          </div>
          <div>
            <label className={label}>Tema *</label>
            <input required value={form.tema} onChange={set('tema')} className={input} placeholder="Ej: El amor de Dios" />
          </div>
        </div>
        <div>
          <label className={label}>Novedades</label>
          <textarea
            rows={3}
            value={form.novedades}
            onChange={set('novedades')}
            className={input}
            placeholder="Visitas nuevas, peticiones de oración, situaciones a tener en cuenta..."
          />
        </div>
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
