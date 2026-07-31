'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { crearPersona, reasignarLider } from '@/app/actions/personas-actions'
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

  // Pestañas del modal: 'nuevo' | 'lider' | 'asignar'
  const [modoModal, setModoModal] = useState<'nuevo' | 'lider' | 'asignar'>('nuevo')

  // Campos de formulario para crear persona
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [liderAsignadoId, setLiderAsignadoId] = useState('')

  // Campos y Filtros para Asignación Masiva
  const [liderDestinoId, setLiderDestinoId] = useState('')
  const [personasSeleccionadas, setPersonasSeleccionadas] = useState<string[]>([])
  const [busquedaNuevos, setBusquedaNuevos] = useState('')
  const [filtroEstadoLider, setFiltroEstadoLider] = useState<'todos' | 'sin_lider' | 'con_lider'>('todos')

  const supabase = createClient()

  const cargarDatos = async () => {
    setLoading(true)

    // Consulta limpia a la tabla personas
    const { data: listPersonas, error } = await supabase
      .from('personas')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al cargar personas:', error)
      setLoading(false)
      return
    }

    if (listPersonas) {
      // 1. Mapeamos un diccionario de id_persona -> nombre_completo
      const mapaNombres = new Map<string, string>()
      listPersonas.forEach((p) => {
        mapaNombres.set(p.id, p.nombre_completo)
      })

      // 2. Formateamos las personas agregando el nombre del líder asignado de manera directa y garantizada
      const personasConLider = listPersonas.map((p) => ({
        ...p,
        nombre_lider_asignado: p.lider_asignado_id ? mapaNombres.get(p.lider_asignado_id) || null : null,
      }))

      setPersonas(personasConLider)
      setLideres(personasConLider.filter((p) => p.tipo_persona === 'lider' || p.tipo_persona === 'pastor'))
    }

    setLoading(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const resetFormularios = () => {
    setNombreCompleto('')
    setTelefono('')
    setDireccion('')
    setEmail('')
    setPassword('')
    setLiderAsignadoId('')
    setLiderDestinoId('')
    setPersonasSeleccionadas([])
    setBusquedaNuevos('')
    setFiltroEstadoLider('todos')
  }

  // Filtrado reactivo para la pestaña de asignación
  const listaNuevosFiltrada = useMemo(() => {
    return personas
      .filter((p) => p.tipo_persona === 'nuevo')
      .filter((p) => {
        // Filtro por texto
        const coincideNombre = p.nombre_completo.toLowerCase().includes(busquedaNuevos.toLowerCase())
        if (!coincideNombre) return false

        // Filtro por estado de líder
        if (filtroEstadoLider === 'sin_lider') return !p.lider_asignado_id
        if (filtroEstadoLider === 'con_lider') return Boolean(p.lider_asignado_id)
        return true
      })
  }, [personas, busquedaNuevos, filtroEstadoLider])

  const handleToggleSeleccion = (personaId: string) => {
    setPersonasSeleccionadas((prev) =>
      prev.includes(personaId)
        ? prev.filter((id) => id !== personaId)
        : [...prev, personaId]
    )
  }

  const handleSelectAllNuevos = () => {
    const idsVisibles = listaNuevosFiltrada.map((p) => p.id)
    const todosSeleccionados = idsVisibles.every((id) => personasSeleccionadas.includes(id))

    if (todosSeleccionados) {
      setPersonasSeleccionadas((prev) => prev.filter((id) => !idsVisibles.includes(id)))
    } else {
      setPersonasSeleccionadas((prev) => Array.from(new Set([...prev, ...idsVisibles])))
    }
  }

  const handleSubmitCrear = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    const res = await crearPersona({
      nombreCompleto,
      telefono,
      direccion,
      tipoPersona: modoModal === 'lider' ? 'lider' : 'nuevo',
      rolSistema: modoModal === 'lider' ? 'lider' : null,
      email: modoModal === 'lider' ? email : undefined,
      password: modoModal === 'lider' ? password : undefined,
      liderAsignadoId: modoModal === 'nuevo' ? liderAsignadoId : undefined,
    })

    setSubmitting(false)

    if (res.error) {
      setMessage({ type: 'error', text: res.error })
    } else {
      setMessage({ type: 'success', text: 'Persona registrada correctamente.' })
      resetFormularios()
      setIsModalOpen(false)
      cargarDatos()
    }
  }

  const handleSubmitAsignar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!liderDestinoId) {
      alert('Por favor selecciona un líder de destino.')
      return
    }
    if (personasSeleccionadas.length === 0) {
      alert('Por favor selecciona al menos un integrante para reasignar.')
      return
    }

    setSubmitting(true)
    setMessage(null)

    const res = await reasignarLider({
      liderId: liderDestinoId,
      personasIds: personasSeleccionadas,
    })

    setSubmitting(false)

    if (res.error) {
      setMessage({ type: 'error', text: res.error })
    } else {
      setMessage({
        type: 'success',
        text: `Se reasignaron ${personasSeleccionadas.length} integrante(s) exitosamente.`,
      })
      resetFormularios()
      setIsModalOpen(false)
      cargarDatos()
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Encabezado */}
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
          onClick={() => {
            resetFormularios()
            setIsModalOpen(true)
          }}
          className="bg-[#006C69] text-white px-4 py-2.5 rounded-lg font-medium hover:bg-[#005250] text-sm shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span>+</span> Crear / Asignar Persona
        </button>
      </div>

      {/* Mensajes de Alerta */}
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

      {/* Tabla Principal */}
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
                      {p.nombre_lider_asignado ? (
                        <span className="font-semibold text-gray-700">
                          {p.nombre_lider_asignado}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Sin Líder</span>
                      )}
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

      {/* Modal General */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5">
            <h3 className="text-lg font-bold text-gray-800">Administrar Integrantes</h3>

            {/* Pestañas de Navegación */}
            <div className="grid grid-cols-3 gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setModoModal('nuevo')}
                className={`py-2 rounded-lg transition ${
                  modoModal === 'nuevo'
                    ? 'bg-white text-[#006C69] shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Nuevo Integrante
              </button>
              <button
                type="button"
                onClick={() => setModoModal('lider')}
                className={`py-2 rounded-lg transition ${
                  modoModal === 'lider'
                    ? 'bg-white text-[#006C69] shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Crear Líder
              </button>
              <button
                type="button"
                onClick={() => setModoModal('asignar')}
                className={`py-2 rounded-lg transition ${
                  modoModal === 'asignar'
                    ? 'bg-white text-[#006C69] shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Asignar / Reasignar
              </button>
            </div>

            {/* CREAR NUEVO O LÍDER */}
            {(modoModal === 'nuevo' || modoModal === 'lider') && (
              <form onSubmit={handleSubmitCrear} className="space-y-4">
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

                {modoModal === 'nuevo' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Asignar Líder Inicial
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

                {modoModal === 'lider' && (
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
                    {submitting ? 'Guardando...' : 'Guardar Integrante'}
                  </button>
                </div>
              </form>
            )}

            {/* PESTAÑA: REASIGNAR INTEGRANTES */}
            {modoModal === 'asignar' && (
              <form onSubmit={handleSubmitAsignar} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    1. Selecciona el Líder de Destino
                  </label>
                  <select
                    required
                    value={liderDestinoId}
                    onChange={(e) => setLiderDestinoId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-[#006C69] focus:border-transparent outline-none transition font-medium"
                  >
                    <option value="">-- Seleccionar Líder --</option>
                    {lideres.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre_completo}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-600">
                      2. Selecciona Integrantes
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllNuevos}
                      className="text-[11px] font-semibold text-[#006C69] hover:underline"
                    >
                      Marcar / Desmarcar Visibles
                    </button>
                  </div>

                  {/* Búsqueda y Filtros */}
                  <div className="flex gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Buscar por nombre..."
                      value={busquedaNuevos}
                      onChange={(e) => setBusquedaNuevos(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-[#006C69]"
                    />
                    <select
                      value={filtroEstadoLider}
                      onChange={(e) => setFiltroEstadoLider(e.target.value as any)}
                      className="px-2 py-1.5 border border-gray-200 rounded-lg text-gray-600 bg-white"
                    >
                      <option value="todos">Todos</option>
                      <option value="sin_lider">Sin Líder</option>
                      <option value="con_lider">Con Líder</option>
                    </select>
                  </div>

                  {/* Listado con Badge del Líder Actual */}
                  <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-gray-50/50 p-1 space-y-1">
                    {listaNuevosFiltrada.length === 0 ? (
                      <p className="text-xs text-gray-400 p-4 text-center italic">
                        No hay integrantes que coincidan con la búsqueda.
                      </p>
                    ) : (
                      listaNuevosFiltrada.map((p) => {
                        const checked = personasSeleccionadas.includes(p.id)
                        const tieneLider = Boolean(p.nombre_lider_asignado)

                        return (
                          <label
                            key={p.id}
                            className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer text-xs transition ${
                              checked
                                ? 'bg-[#006C69]/10 border border-[#006C69]/40'
                                : 'hover:bg-white bg-white/60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggleSeleccion(p.id)}
                                className="rounded text-[#006C69] focus:ring-[#006C69] w-4 h-4"
                              />
                              <div>
                                <span className="font-bold text-gray-800 block">
                                  {p.nombre_completo}
                                </span>
                                {p.telefono && (
                                  <span className="text-[11px] text-gray-400 block">
                                    📞 {p.telefono}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Muestra precisa del líder asignado */}
                            <div>
                              {tieneLider ? (
                                <span className="inline-flex items-center text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
                                  Líder: {p.nombre_lider_asignado}
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-medium">
                                  Sin Líder
                                </span>
                              )}
                            </div>
                          </label>
                        )
                      })
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-gray-500 pt-1">
                    <span>
                      Mostrando <strong>{listaNuevosFiltrada.length}</strong> personas
                    </span>
                    <span>
                      Seleccionadas: <strong className="text-[#006C69]">{personasSeleccionadas.length}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || personasSeleccionadas.length === 0}
                    className="px-4 py-2 bg-[#006C69] text-white rounded-lg text-sm font-medium hover:bg-[#005250] disabled:opacity-50 transition"
                  >
                    {submitting
                      ? 'Reasignando...'
                      : `Asignar ${personasSeleccionadas.length} Persona(s)`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      <ResetPasswordModal
        isOpen={resetModalState.isOpen}
        authUserId={resetModalState.authUserId}
        nombrePersona={resetModalState.nombre}
        onClose={() => setResetModalState({ ...resetModalState, isOpen: false })}
      />
    </div>
  )
}