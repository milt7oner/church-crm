'use client'

import { useState } from 'react'
import { actualizarSeguimientoEtapa } from '@/app/actions/seguimiento-actions'
import { iniciarSeguimientoEtapa } from '@/app/actions/seguimiento-actions' // Importamos la nueva acción

interface EtapaItemProps {
  seguimientoId: string
  personaId: string
  etapa: {
    orden?: number
    nombre: string
    descripcion?: string
    tiene_subpasos: boolean
    total_subpasos?: number
  }
  completadoInicial: boolean
  subpasosIniciales: number
  notasIniciales: string
  fechaInicioInicial?: string | null // 👈 Nueva prop para la fecha de inicio
}

export default function EtapaItemCard({
  seguimientoId,
  personaId,
  etapa,
  completadoInicial,
  subpasosIniciales,
  notasIniciales,
  fechaInicioInicial,
}: EtapaItemProps) {
  const [completado, setCompletado] = useState(completadoInicial)
  const [subpasos, setSubpasos] = useState(subpasosIniciales)
  const [notas, setNotas] = useState(notasIniciales)
  const [fechaInicio, setFechaInicio] = useState<string | null | undefined>(fechaInicioInicial)
  
  const [saving, setSaving] = useState(false)
  const [starting, setStarting] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  // Función para guardar avances regulares
  const handleGuardar = async (nuevoCompletado = completado, nuevoSubpasos = subpasos) => {
    setSaving(true)
    setSavedMsg(false)

    const res = await actualizarSeguimientoEtapa({
      seguimientoId,
      personaId,
      completado: nuevoCompletado,
      subpasosCompletados: nuevoSubpasos,
      notas,
    })

    setSaving(false)
    if (res.success) {
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2000)
    }
  }

  // 🎯 Acción para dar clic en "Comenzar"
  const handleComenzarEtapa = async () => {
    setStarting(true)
    const res = await iniciarSeguimientoEtapa({ seguimientoId, personaId })
    setStarting(false)

    if (res.success && res.fechaInicio) {
      setFechaInicio(res.fechaInicio)
    }
  }

  // Modificar lecciones (+1 / -1)
  const handleSubpasoChange = (delta: number) => {
    const max = etapa.total_subpasos || 5
    const nuevoValor = Math.max(0, Math.min(max, subpasos + delta))
    setSubpasos(nuevoValor)
    
    // Si no ha iniciado y sube de lecciones, auto-iniciamos la fecha
    if (!fechaInicio && delta > 0) {
      handleComenzarEtapa()
    }

    const autoCompletado = nuevoValor === max
    if (autoCompletado !== completado) setCompletado(autoCompletado)

    handleGuardar(autoCompletado, nuevoValor)
  }

  // Formatear la fecha para mostrarla amigable (ej: "03 Ago 2026")
  const formatearFecha = (fechaIso?: string | null) => {
    if (!fechaIso) return null
    return new Date(fechaIso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div
      className={`border rounded-xl p-5 bg-white shadow-sm transition ${
        completado ? 'border-green-300 bg-green-50/30' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">
            📖
          </span>
          <div>
            <h3 className="font-bold text-gray-800 text-base">{etapa.nombre}</h3>
            {etapa.descripcion && (
              <p className="text-xs text-gray-500 mt-0.5">{etapa.descripcion}</p>
            )}

            {/* 🎯 SECCIÓN DE FECHA DE INICIO / BOTÓN COMANZAR */}
            <div className="mt-2 flex items-center gap-2">
              {fechaInicio ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#006C69] bg-[#006C69]/10 px-2 py-0.5 rounded-md">
                  🚀 Iniciado el: {formatearFecha(fechaInicio)}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleComenzarEtapa}
                  disabled={starting}
                  className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#006C69] hover:bg-[#005250] active:scale-95 transition px-3 py-1 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {starting ? 'Iniciando...' : '▶ Comenzar esta etapa'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Checkbox de Cartilla Finalizada */}
        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border text-xs font-semibold text-gray-700">
          <input
            type="checkbox"
            checked={completado}
            onChange={(e) => {
              const checked = e.target.checked
              setCompletado(checked)
              
              // Si marca como finalizado sin haber iniciado, registramos la fecha de inicio también
              if (checked && !fechaInicio) {
                handleComenzarEtapa()
              }

              const nuevasLecciones = checked ? (etapa.total_subpasos || 5) : subpasos
              setSubpasos(nuevasLecciones)
              handleGuardar(checked, nuevasLecciones)
            }}
            className="w-4 h-4 text-[#006C69] rounded focus:ring-[#006C69]"
          />
          {completado ? 'Cartilla Finalizada' : 'Marcar Finalizada'}
        </label>
      </div>

      {/* Control de Lecciones */}
      <div className="mt-4 pt-3 border-t flex items-center justify-between bg-gray-50 p-3 rounded-lg">
        <span className="text-xs font-medium text-gray-700">
          Lecciones completadas: <strong>{subpasos} de {etapa.total_subpasos || 5}</strong>
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSubpasoChange(-1)}
            disabled={subpasos <= 0 || saving}
            className="w-8 h-8 bg-white border rounded-lg font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 text-sm shadow-sm flex items-center justify-center"
          >
            -
          </button>
          <span className="text-sm font-semibold text-gray-800 px-2">{subpasos}</span>
          <button
            onClick={() => handleSubpasoChange(1)}
            disabled={subpasos >= (etapa.total_subpasos || 5) || saving}
            className="w-8 h-8 bg-white border rounded-lg font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 text-sm shadow-sm flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>

      {/* Notas / Observaciones */}
      <div className="mt-3">
        <textarea
          rows={2}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          onBlur={() => handleGuardar()}
          placeholder="Añade observaciones (ej: 'Realizada lección 2 en su casa, muy receptivo')"
          className="w-full p-2 border rounded-md text-xs outline-none focus:ring-1 focus:ring-[#006C69] bg-gray-50/50 text-gray-800"
        />
      </div>

      {/* Indicadores de guardado */}
      <div className="mt-1 flex justify-end">
        {saving && <span className="text-xs text-gray-400">Guardando...</span>}
        {savedMsg && <span className="text-xs text-green-600 font-medium">✓ Guardado</span>}
      </div>
    </div>
  )
}