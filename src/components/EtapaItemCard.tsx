'use client'

import { useState } from 'react'
import { actualizarSeguimientoEtapa } from '@/app/actions/seguimiento-actions'

interface EtapaItemProps {
  seguimientoId: string
  personaId: string
  etapa: {
    orden: number
    nombre: string
    descripcion?: string
    tiene_subpasos: boolean
    total_subpasos?: number
  }
  completadoInicial: boolean
  subpasosIniciales: number
  notasIniciales: string
}

export default function EtapaItemCard({
  seguimientoId,
  personaId,
  etapa,
  completadoInicial,
  subpasosIniciales,
  notasIniciales,
}: EtapaItemProps) {
  const [completado, setCompletado] = useState(completadoInicial)
  const [subpasos, setSubpasos] = useState(subpasosIniciales)
  const [notas, setNotas] = useState(notasIniciales)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

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

  // Modificar subpasos (+1 / -1)
  const handleSubpasoChange = (delta: number) => {
    const max = etapa.total_subpasos || 99
    const nuevoValor = Math.max(0, Math.min(max, subpasos + delta))
    setSubpasos(nuevoValor)
    
    // Si alcanza el máximo de subpasos, marcar completado automáticamente
    const autoCompletado = etapa.total_subpasos ? nuevoValor === etapa.total_subpasos : completado
    if (autoCompletado !== completado) setCompletado(autoCompletado)

    handleGuardar(autoCompletado, nuevoValor)
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
            {etapa.orden}
          </span>
          <div>
            <h3 className="font-bold text-gray-800 text-base">{etapa.nombre}</h3>
            {etapa.descripcion && <p className="text-xs text-gray-500 mt-0.5">{etapa.descripcion}</p>}
          </div>
          
        </div>

        {/* Checkbox de etapa completada */}
        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border text-xs font-semibold text-gray-700">
          <input
            type="checkbox"
            checked={completado}
            onChange={(e) => {
              const checked = e.target.checked
              setCompletado(checked)
              handleGuardar(checked, subpasos)
            }}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          {completado ? 'Completado' : 'Marcar Lista'}
        </label>
      </div>

      {/* Control de Subpasos (si aplica a la etapa, ej: devocionales o lecciones) */}
      {etapa.tiene_subpasos && (
        <div className="mt-4 pt-3 border-t flex items-center justify-between bg-gray-50 p-3 rounded-lg">
          <span className="text-xs font-medium text-gray-700">
            Avance de Lecciones/Devocionales: <strong>{subpasos} de {etapa.total_subpasos}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSubpasoChange(-1)}
              disabled={subpasos <= 0 || saving}
              className="w-7 h-7 bg-white border rounded font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 text-sm"
            >
              -
            </button>
            <span className="text-sm font-semibold text-gray-800 px-1">{subpasos}</span>
            <button
              onClick={() => handleSubpasoChange(1)}
              disabled={subpasos >= (etapa.total_subpasos || 99) || saving}
              className="w-7 h-7 bg-white border rounded font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 text-sm"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Notas / Observaciones */}
      <div className="mt-3">
        <textarea
          rows={2}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          onBlur={() => handleGuardar()}
          placeholder="Añade una nota o comentario sobre este avance (ej: 'llamada realizada, se reprograma')"
          className="w-full p-2 border rounded-md text-xs outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50/50"
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