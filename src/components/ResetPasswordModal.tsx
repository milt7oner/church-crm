'use client'

import { useState } from 'react'
import { restablecerClaveLider } from '@/app/actions/lideres-actions'
import Modal from '@/components/ui/Modal'
import { useActionForm } from '@/components/ui/useActionForm'
import { alertError, alertOk, btnPrimary, btnSecondary, input, label } from '@/lib/ui'

interface ResetPasswordModalProps {
  perfilId: string
  nombrePersona: string
  isOpen: boolean
  onClose: () => void
}

export default function ResetPasswordModal({ perfilId, nombrePersona, isOpen, onClose }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('')
  const [listo, setListo] = useState(false)
  const { pending, error, run } = useActionForm(() => {
    setListo(true)
    setNewPassword('')
  })

  const cerrar = () => {
    setListo(false)
    onClose()
  }

  return (
    <Modal titulo="Restablecer contraseña" abierto={isOpen} onCerrar={cerrar}>
      <p className="text-sm text-gray-600">
        Para: <strong>{nombrePersona}</strong>
      </p>

      {error && <div className={alertError}>{error}</div>}
      {listo && <div className={alertOk}>Contraseña actualizada. Compártela con el líder.</div>}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          run(() => restablecerClaveLider(perfilId, newPassword))
        }}
        className="space-y-4"
      >
        <div>
          <label className={label}>Nueva contraseña</label>
          <input
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={input}
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={cerrar} className={`${btnSecondary} flex-1`}>
            Cerrar
          </button>
          <button type="submit" disabled={pending} className={`${btnPrimary} flex-1`}>
            {pending ? 'Guardando...' : 'Cambiar clave'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
