'use client'

import { useState } from 'react'
import { cambiarEstadoConsolidacion } from '@/app/actions/personas-actions' // Revisa tu ruta de Server Actions

interface CambiarEstadoProps {
  personaId: string
  estadoActual: string
}

const ESTADOS = [
  { value: 'activo', label: 'Activo', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'abandono', label: 'Abandono', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'pausado', label: 'Pausado', bg: 'bg-[#006C69]/10 text-[#006C69] border-[#006C69]/20' },
  { value: 'consolidado', label: 'Consolidado', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
]

export default function CambiarEstadoBoton({ personaId, estadoActual }: CambiarEstadoProps) {
  const [estado, setEstado] = useState(estadoActual || 'activo')
  const [loading, setLoading] = useState(false)

  const handleEstadoChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevo = e.target.value
    setEstado(nuevo)
    setLoading(true)

    const res = await cambiarEstadoConsolidacion(personaId, nuevo)
    setLoading(false)

    if (!res.success) {
      // Si falla, revertimos al estado anterior
      setEstado(estado)
    }
  }

  const estadoConfig = ESTADOS.find((e) => e.value === estado) || ESTADOS[0]

  return (
    <div className="relative inline-block">
      <select
        value={estado}
        onChange={handleEstadoChange}
        disabled={loading}
        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide cursor-pointer outline-none transition appearance-none pr-4 ${
          estadoConfig.bg
        } ${loading ? 'opacity-50 cursor-wait' : ''}`}
      >
        <option value="activo">En proceso (Activo)</option>
        <option value="completado">Completado</option>
        <option value="inactivo">Inactivo</option>
        <option value="abandono">Abandono</option>
      </select>
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] pointer-events-none opacity-60">
        ▼
      </span>
    </div>
  )
}