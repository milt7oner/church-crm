'use client'

import { useState } from 'react'
import { crearConsolidadoPorLider } from '@/app/actions/consolidados-lider-actions'

export default function NuevoConsolidadoModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [formData, setFormData] = useState({
    nombreCompleto: '',
    telefono: '',
    direccion: '',
    fechaIngreso: new Date().toISOString().split('T')[0],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const res = await crearConsolidadoPorLider(formData)
    setLoading(false)

    if (res?.error) {
      setErrorMsg(res.error)
    } else {
      setIsOpen(false)
      setFormData({
        nombreCompleto: '',
        telefono: '',
        direccion: '',
        fechaIngreso: new Date().toISOString().split('T')[0],
      })
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-[#006C69] hover:bg-[#005250] text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
      >
        <span>➕</span> Registrar Nuevo Consolidado
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-gray-800 text-sm">
                Registrar Persona a Consolidar
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-2.5 rounded-xl">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pedro Pérez"
                  value={formData.nombreCompleto}
                  onChange={(e) =>
                    setFormData({ ...formData, nombreCompleto: e.target.value })
                  }
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
                    placeholder="Ej: 3001234567"
                    value={formData.telefono}
                    onChange={(e) =>
                      setFormData({ ...formData, telefono: e.target.value })
                    }
                    className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-1 focus:ring-[#006C69]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Fecha de Ingreso
                  </label>
                  <input
                    type="date"
                    value={formData.fechaIngreso}
                    onChange={(e) =>
                      setFormData({ ...formData, fechaIngreso: e.target.value })
                    }
                    className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-1 focus:ring-[#006C69]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  placeholder="Ej: Calle 10 # 5 - 20, Barrio Centenario"
                  value={formData.direccion}
                  onChange={(e) =>
                    setFormData({ ...formData, direccion: e.target.value })
                  }
                  className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-1 focus:ring-[#006C69]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2.5 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#006C69] hover:bg-[#005250] text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}