'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CambiarPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' })
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    setLoading(false)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: '¡Contraseña actualizada con éxito!' })
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white border rounded-xl shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Cambiar Contraseña</h2>
      <p className="text-sm text-gray-600 mb-6">
        Ingresa tu nueva clave de acceso para actualizar las credenciales de tu cuenta.
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

      <form onSubmit={handlePasswordChange} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nueva Contraseña</label>
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Confirmar Nueva Contraseña</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Repite tu contraseña"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-600 hover:underline"
          >
            Volver
          </button>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition disabled:opacity-50 text-sm"
          >
            {loading ? 'Actualizando...' : 'Guardar Cambio'}
          </button>
        </div>
      </form>
    </div>
  )
}