'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
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
        setError('El usuario autenticado no está vinculado a ninguna fila en la tabla personas.')
        setLoading(false)
        return 
      }

      const persona = personas[0]

      // 3. Redireccionar según el rol
      if (['super_admin', 'pastor', 'encargado'].includes(persona.rol_sistema)) {
        router.push('/admin/dashboard')
      } else if (persona.rol_sistema === 'lider') {
        router.push('/')
      } else {
        setError('El usuario no tiene permisos de acceso al sistema.')
      }
    }
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

        {/* 🎯 Enlace al formulario de autoregistro de líderes */}
        <div className="text-center pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            ¿Eres líder y tienes un código de acceso?{' '}
            <Link 
              href="/registro-lider" 
              className="text-[#006C69] font-bold hover:underline"
            >
              Regístrate aquí
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}