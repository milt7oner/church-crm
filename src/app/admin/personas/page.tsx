'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { crearPersona } from '@/app/actions/personas-actions'
import ResetPasswordModal from '@/components/ResetPasswordModal'

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
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Integrantes</h1>
          <p className="text-sm text-gray-600">Líderes de consolidación y nuevos integrantes</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 text-sm transition"
        >
          + Crear Persona
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm mb-4 ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabla de Personas */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase">
              <th className="p-4">Nombre</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Teléfono</th>
              <th className="p-4">Líder Asignado</th>
              <th className="p-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">Cargando...</td>
              </tr>
            ) : personas.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">No hay integrantes registrados.</td>
              </tr>
            ) : (
              personas.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-800">{p.nombre_completo}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${
                        p.tipo_persona === 'nuevo'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {p.tipo_persona}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">{p.telefono || '—'}</td>
                  <td className="p-4 text-gray-600">
                    {p.lider_asignado?.nombre_completo || '—'}
                  </td>
                  <td className="p-4">
                    {p.auth_user_id && (
                      <button
                        onClick={() =>
                          setResetModalState({
                            isOpen: true,
                            authUserId: p.auth_user_id,
                            nombre: p.nombre_completo,
                          })
                        }
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Reset Password
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Creación */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Registrar Integrante</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Registro</label>
                <div className="flex gap-4">
                  <label className="flex items-center text-sm gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="tipo"
                      checked={tipoPersona === 'nuevo'}
                      onChange={() => setTipoPersona('nuevo')}
                    />
                    Nuevo Integrante
                  </label>
                  <label className="flex items-center text-sm gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="tipo"
                      checked={tipoPersona === 'lider'}
                      onChange={() => setTipoPersona('lider')}
                    />
                    Líder (Con Login)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  className="w-full p-2 border rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600">Teléfono</label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full p-2 border rounded-md text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600">Dirección</label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full p-2 border rounded-md text-sm outline-none"
                  />
                </div>
              </div>

              {tipoPersona === 'nuevo' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600">Asignar Líder</label>
                  <select
                    value={liderAsignadoId}
                    onChange={(e) => setLiderAsignadoId(e.target.value)}
                    className="w-full p-2 border rounded-md text-sm outline-none"
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
                    <label className="block text-xs font-semibold text-gray-600">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-2 border rounded-md text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600">Contraseña Inicial</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-2 border rounded-md text-sm outline-none"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-md text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
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