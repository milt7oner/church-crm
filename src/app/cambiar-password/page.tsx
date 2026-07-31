'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

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
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-gray-100 rounded-2xl shadow-xl p-8 space-y-6">
        
        {/* Cabecera / Identificador visual */}
        <div className="text-center">
          <div className="w-12 h-12 bg-[#006C69]/10 text-[#006C69] rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-3">
            🔐
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Cambiar Contraseña</h2>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Ingresa tu nueva clave de acceso para actualizar las credenciales de tu cuenta
          </p>
        </div>

        {/* Alertas */}
        {message && (
          <div
            className={`p-3.5 rounded-xl text-xs border-l-4 shadow-sm transition-all ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                : 'bg-red-50 border-red-500 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Nueva Contraseña
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-[#006C69] focus:border-transparent outline-none transition"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-[#006C69] focus:border-transparent outline-none transition"
              placeholder="Repite tu nueva contraseña"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition"
            >
              &larr; Volver
            </button>

            <button
              type="submit"
              disabled={loading}
              className="bg-[#006C69] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#005250] transition-all shadow-sm text-xs disabled:opacity-50"
            >
              {loading ? 'Actualizando...' : 'Guardar Cambio'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}