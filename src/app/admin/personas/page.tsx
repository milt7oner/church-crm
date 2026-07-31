'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { crearPersona } from '@/app/actions/personas-actions'
import ResetPasswordModal from '@/components/ResetPasswordModal'
import Link from 'next/link'

export default function PersonasPage() {
  const [personas, setPersonas] = useState<any[]>([])
  const [lideres, setLideres] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Estado del modal de reset clave
  const [resetModalState, setResetModalState] = useState<{
    isOpen: boolean
    authUserId: string
    nombre: string
  }>({ isOpen: false, authUserId: '', nombre: '' })

  // Campos del formulario
  const [tipoPersona, setTipoPersona] = useState<'nuevo' | 'lider'>('nuevo')
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [liderAsignadoId, setLiderAsignadoId] = useState('')

  const supabase = createClient()

  const cargarDatos = async () => {
    setLoading(true)
    const { data: listPersonas } = await supabase
      .from('personas')
      .select('*, lider_asignado:personas!lider_asignado_id(nombre_completo)')
      .order('created_at', { ascending: false })

    if (listPersonas) {
      setPersonas(listPersonas)
      setLideres(listPersonas.filter((p) => p.tipo_persona === 'lider' || p.tipo_persona === 'pastor'))
    }
    setLoading(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    const res = await crearPersona({
      nombreCompleto,
      telefono,
      direccion,
      tipoPersona,
      rolSistema: tipoPersona === 'lider' ? 'lider' : null,
      email: tipoPersona === 'lider' ? email : undefined,
      password: tipoPersona === 'lider' ? password : undefined,
      liderAsignadoId: tipoPersona === 'nuevo' ? liderAsignadoId : undefined,
    })

    setSubmitting(false)

    if (res.error) {
      setMessage({ type: 'error', text: res.error })
    } else {
      setMessage({ type: 'success', text: 'Persona registrada correctamente.' })
      setNombreCompleto('')
      setTelefono('')
      setDireccion('')
      setEmail('')
      setPassword('')
      setLiderAsignadoId('')
      setIsModalOpen(false)
      cargarDatos()
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      
      {/* Botón de regreso e Identificación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006C69] hover:text-[#005250] mb-2 transition"
          >
            &larr; Volver al Panel
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Integrantes</h1>
          <p className="text-xs text-gray-500">
            Administra a los líderes de consolidación y nuevos integrantes registrados
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#006C69] text-white px-4 py-2.5 rounded-lg font-medium hover:bg-[#005250] text-sm shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span>+</span> Crear Persona
        </button>
      </div>

      {/* Alertas */}
      {message && (
        <div
          className={`p-3.5 rounded-lg text-sm border-l-4 shadow-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
              : 'bg-red-50 border-red-500 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabla de Personas */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="p-4">Nombre</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Teléfono</th>
                <th className="p-4">Líder Asignado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    Cargando integrantes...
                  </td>
                </tr>
              ) : personas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    No hay integrantes registrados en el sistema.
                  </td>
                </tr>
              ) : (
                personas.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="p-4 font-medium text-gray-800">{p.nombre_completo}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          p.tipo_persona === 'nuevo'
                            ? 'bg-[#0097A3]/10 text-[#0097A3]'
                            : 'bg-[#006C69]/10 text-[#006C69]'
                        }`}
                      >
                        {p.tipo_persona === 'nuevo' ? 'Nuevo' : 'Líder'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{p.telefono || '—'}</td>
                    <td className="p-4 text-gray-600">
                      {p.lider_asignado?.nombre_completo || '—'}
                    </td>
                    <td className="p-4 text-right">
                      {p.auth_user_id && (
                        <button
                          onClick={() =>
                            setResetModalState({
                              isOpen: true,
                              authUserId: p.auth_user_id,
                              nombre: p.nombre_completo,
                            })
                          }
                          className="text-xs text-[#006C69] hover:text-[#005250] font-semibold hover:underline"
                        >
                          Restablecer Clave
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Creación */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Registrar Integrante</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Tipo de Registro
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                      tipoPersona === 'nuevo'
                        ? 'border-[#006C69] bg-[#006C69]/5 text-[#006C69]'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo"
                      className="hidden"
                      checked={tipoPersona === 'nuevo'}
                      onChange={() => setTipoPersona('nuevo')}
                    />
                    Nuevo Integrante
                  </label>

                  <label
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                      tipoPersona === 'lider'
                        ? 'border-[#006C69] bg-[#006C69]/5 text-[#006C69]'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo"
                      className="hidden"
                      checked={tipoPersona === 'lider'}
                      onChange={() => setTipoPersona('lider')}
                    />
                    Líder (Con Acceso)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-[#006C69] focus:border-transparent outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-[#006C69] focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-[#006C69] focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              {tipoPersona === 'nuevo' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Asignar Líder
                  </label>
                  <select
                    value={liderAsignadoId}
                    onChange={(e) => setLiderAsignadoId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-[#006C69] focus:border-transparent outline-none transition"
                  >
                    <option value="">Sin Líder Asignado</option>
                    {lideres.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre_completo}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {tipoPersona === 'lider' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-[#006C69] focus:border-transparent outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Contraseña Inicial
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-[#006C69] focus:border-transparent outline-none transition"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#006C69] text-white rounded-lg text-sm font-medium hover:bg-[#005250] disabled:opacity-50 transition"
                >
                  {submitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Restablecimiento de Contraseña */}
      <ResetPasswordModal
        isOpen={resetModalState.isOpen}
        authUserId={resetModalState.authUserId}
        nombrePersona={resetModalState.nombre}
        onClose={() => setResetModalState({ ...resetModalState, isOpen: false })}
      />
    </div>
  )
}