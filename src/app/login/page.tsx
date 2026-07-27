'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 1. Autenticar en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // 2. Consultar la tabla 'personas' para conocer el rol del usuario
    if (authData.user) {
      // En lugar de usar .single() directo:
      const { data: personas, error: personaError } = await supabase
        .from('personas')
        .select('rol_sistema, nombre_completo')
        .eq('auth_user_id', authData.user.id)

      if (personaError) {
        console.error('Error al consultar personas:', personaError)
        setError('Error al consultar la base de datos.')
        setLoading(false)
        return
      }

      if (!personas || personas.length === 0) {
        setError('El usuario autenticado no está vinculado a ninguna fila en la tabla personas (auth_user_id no coincide).')
        setLoading(false)
        return 
      }

      const persona = personas[0]

      // 3. Redireccionar según el rol
      if (['super_admin', 'pastor', 'encargado'].includes(persona.rol_sistema)) {
        router.push('/admin/dashboard')
      } else if (persona.rol_sistema === 'lider') {
        router.push('/lider/welcome')
      } else {
        setError('El usuario no tiene permisos de acceso al sistema.')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Vida Abundante — Acceso
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition"
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}