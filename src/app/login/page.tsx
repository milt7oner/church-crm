'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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

    // 2. Verify the user has an active profile in Casas de Vida
    const { data: perfil, error: perfilError } = await supabase
      .from('perfiles')
      .select('id')
      .eq('auth_user_id', authData.user.id)
      .eq('activo', true)
      .maybeSingle()

    if (perfilError) {
      console.error('Error al consultar perfiles:', perfilError)
      setError('Error al consultar la base de datos.')
      setLoading(false)
      return
    }

    if (!perfil) {
      await supabase.auth.signOut()
      setError('Tu usuario no tiene acceso al sistema. Comunícate con tu líder o con el pastor.')
      setLoading(false)
      return
    }

    router.push('/inicio')
    router.refresh()
  }

  return (
    // Fondo esmeralda plano corporativo
    <div className="min-h-screen flex items-center justify-center bg-[#006C69] p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
        
        {/* Logo e Identidad */}
        <div className="flex flex-col items-center">
          <div className="relative w-48 h-20 mb-2">
            <Image
              src="/images/Logo-Negro.png"
              alt="Centro Cristiano Casa del Rey Popayán"
              fill
              priority
              className="object-contain"
            />
          </div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-2 text-center">
            Centro Cristiano Casa Del Rey Popayán
          </p>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="p-3.5 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg">
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006C69] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006C69] focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#006C69] hover:bg-[#005452] active:bg-[#003D3B] text-white py-3 rounded-lg font-semibold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

      </div>
    </div>
  )
}