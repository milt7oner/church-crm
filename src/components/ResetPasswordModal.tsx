'use client'

import { useState } from 'react'
import { adminResetPassword } from '@/app/actions/admin-actions'

interface ResetPasswordModalProps {
  authUserId: string
  nombrePersona: string
  isOpen: boolean
  onClose: () => void
}

export default function ResetPasswordModal({
  authUserId,
  nombrePersona,
  isOpen,
  onClose,
}: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (!isOpen) return null

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'La contraseña debe tener mínimo 6 caracteres.' })
      setLoading(false)
      return
    }

    const res = await adminResetPassword(authUserId, newPassword)
    setLoading(false)

    if (res.error) {
      setMessage({ type: 'error', text: res.error })
    } else {
      setMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' })
      setNewPassword('')
      setTimeout(() => {
        setMessage(null)
        onClose()
      }, 1500)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-800 mb-1">
          Restablecer Contraseña
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Para: <strong>{nombrePersona}</strong>
        </p>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm mb-4 ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nueva Contraseña</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              placeholder="Ingresa la nueva clave"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Cambiar Clave'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}