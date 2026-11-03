'use client'

import { useState } from 'react'
import { actualizarRed, crearRed, desactivarRed } from '@/app/actions/redes-actions'
import ConfirmButton from '@/components/ui/ConfirmButton'
import Modal from '@/components/ui/Modal'
import { useActionForm } from '@/components/ui/useActionForm'
import { alertError, btnLink, btnPrimary, btnSecondary, input, label } from '@/lib/ui'

type RedEditable = { id: string; nombre: string }

function RedFormModal({ red, onCerrar }: { red?: RedEditable; onCerrar: () => void }) {
  const [nombre, setNombre] = useState(red?.nombre ?? '')
  const { pending, error, run } = useActionForm(onCerrar)

  return (
    <Modal titulo={red ? 'Editar red' : 'Nueva red'} abierto onCerrar={onCerrar}>
      {error && <div className={alertError}>{error}</div>}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run(() => (red ? actualizarRed(red.id, nombre) : crearRed(nombre)))
        }}
        className="space-y-3"
      >
        <div>
          <label className={label}>Nombre de la red *</label>
          <input required value={nombre} onChange={(e) => setNombre(e.target.value)} className={input} placeholder="Ej: Red de jóvenes" />
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
