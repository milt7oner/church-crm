'use client'

import { useState } from 'react'
import { actualizarRed, crearRed, desactivarRed, type RedInput } from '@/app/actions/redes-actions'
import ConfirmButton from '@/components/ui/ConfirmButton'
import Modal from '@/components/ui/Modal'
import { useActionForm } from '@/components/ui/useActionForm'
import { TIPO_RED_LABEL, TIPOS_RED, type TipoRed } from '@/lib/redes'
import { alertError, btnLink, btnPrimary, btnSecondary, input, label } from '@/lib/ui'

type RedEditable = { id: string; nombre: string; tipo: TipoRed; descripcion: string | null }

function RedFormModal({ red, onCerrar }: { red?: RedEditable; onCerrar: () => void }) {
  const [form, setForm] = useState<RedInput>({
    nombre: red?.nombre ?? '',
    tipo: red?.tipo ?? 'adultos',
    descripcion: red?.descripcion ?? '',
  })
  const { pending, error, run } = useActionForm(onCerrar)

  return (
    <Modal titulo={red ? 'Editar red' : 'Nueva red'} abierto onCerrar={onCerrar}>
      {error && <div className={alertError}>{error}</div>}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run(() => (red ? actualizarRed(red.id, form) : crearRed(form)))
        }}
        className="space-y-3"
      >
        <div>
          <label className={label}>Nombre de la red *</label>
          <input
            required
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className={input}
            placeholder="Ej: Red Norte"
          />
        </div>
        <fieldset>
          <legend className={label}>Tipo de red *</legend>
          <div className="grid grid-cols-3 gap-2">
            {TIPOS_RED.map((tipo) => (
              <button
                key={tipo}
                type="button"
                aria-pressed={form.tipo === tipo}
                onClick={() => setForm({ ...form, tipo })}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                  form.tipo === tipo
                    ? 'border-[#006C69] bg-[#006C69] text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-[#006C69]/40'
                }`}
              >
                {TIPO_RED_LABEL[tipo]}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label className={label}>Barrios o zonas</label>
          <textarea
            rows={3}
            value={form.descripcion ?? ''}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            className={input}
            placeholder="Ej: La Esmeralda, Bello Horizonte, Villa del Norte"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onCerrar} className={`${btnSecondary} flex-1`}>
            Cancelar
          </button>
          <button type="submit" disabled={pending} className={`${btnPrimary} flex-1`}>
            {pending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function NuevaRedBoton() {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={btnPrimary}>
        + Nueva red
      </button>
      {abierto && <RedFormModal onCerrar={() => setAbierto(false)} />}
    </>
  )
}

export function RedAcciones({ red }: { red: RedEditable }) {
  const [editando, setEditando] = useState(false)
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => setEditando(true)} className={btnLink}>
        Editar
      </button>
      <ConfirmButton
        label="Desactivar"
        confirmacion={`¿Desactivar la red "${red.nombre}"?`}
        accion={() => desactivarRed(red.id)}
      />
      {editando && <RedFormModal red={red} onCerrar={() => setEditando(false)} />}
    </div>
  )
}
