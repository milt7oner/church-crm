'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { registrarLiderAutonomo } from '@/app/actions/registro-lider-actions'

interface Iglesia {
  id: string
  nombre: string
}

export default function RegistroLiderForm({ iglesias }: { iglesias: Iglesia[] }) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    telefono: '',
    direccion: '',
    iglesiaId: iglesias[0]?.id || '',
    email: '',
    password: '',
    codigoRegistro: '',
  })
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    if (!formData.iglesiaId) {
      setErrorMsg('Debes seleccionar una iglesia.')
      setLoading(false)
      return
    }

    const res = await registrarLiderAutonomo(formData)
    setLoading(false)

    if (res?.error) {
      setErrorMsg(res.error)
    } else {
      router.push('/login?registrado=true')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
        
        {/* Header / Logo */}
        <div className="text-center space-y-2">
          <Image
            src="/images/Logo-Negro.png"
            alt="Vida Abundante Logo"
            width={44}
            height={44}
            className="mx-auto object-contain"
            priority
          />
          <h1 className="text-xl font-bold text-gray-800">Registro de Líderes</h1>
          <p className="text-xs text-gray-500">
            Ingresa tus datos y el código proporcionado por tu iglesia
          </p>
        </div>

        {/* Mensaje de Error */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Código de Registro (Requerido)
            </label>
            <input
              type="text"
              required
              placeholder="Ej: VA-8X2K"
              value={formData.codigoRegistro}
              onChange={(e) =>
                setFormData({ ...formData, codigoRegistro: e.target.value.toUpperCase() })
              }
              className="w-full text-sm font-bold tracking-widest uppercase p-2.5 border rounded-xl outline-none focus:ring-1 focus:ring-[#006C69] bg-emerald-50/30 text-[#006C69] border-emerald-200 placeholder:font-normal placeholder:tracking-normal"
            />
          </div>

          {/* Carga dinámica de Iglesias */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Sede / Iglesia
            </label>
            <select
              required
              value={formData.iglesiaId}
              onChange={(e) => setFormData({ ...formData, iglesiaId: e.target.value })}
              className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-1 focus:ring-[#006C69] bg-white"
            >
              <option value="" disabled>
                Selecciona tu iglesia...
              </option>
              {iglesias.map((iglesia) => (
                <option key={iglesia.id} value={iglesia.id}>
                  {iglesia.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              required
              placeholder="Tu nombre completo"
              value={formData.nombreCompleto}
              onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
              className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-1 focus:ring-[#006C69]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                required
                placeholder="Ej: 3001234567"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-1 focus:ring-[#006C69]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Dirección (Opcional)
              </label>
              <input
                type="text"
                placeholder="Calle / Carrera / Barrio"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-1 focus:ring-[#006C69]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              placeholder="lider@correo.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-1 focus:ring-[#006C69]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-1 focus:ring-[#006C69]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#006C69] hover:bg-[#005250] text-white text-xs font-bold py-3 rounded-xl transition shadow-sm disabled:opacity-50 pt-3"
          >
            {loading ? 'Verificando y Creando Cuenta...' : 'Completar Registro'}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link href="/login" className="text-xs text-gray-500 hover:text-gray-800">
            ¿Ya tienes cuenta? <span className="text-[#006C69] font-bold">Inicia Sesión</span>
          </Link>
        </div>
      </div>
    </div>
  )
}