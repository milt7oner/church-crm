'use client'

import { useState, useEffect } from 'react'
import { generarCodigoRegistro, obtenerCodigoActivo } from '@/app/actions/codigos-actions'

export default function GenerarCodigoModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [horas, setHoras] = useState(6)
  const [loading, setLoading] = useState(false)
  const [codigoGenerado, setCodigoGenerado] = useState<{
    codigo: string
    expiraEn: string
  } | null>(null)
  
  const [tiempoRestante, setTiempoRestante] = useState<string>('')
  const [copiado, setCopiado] = useState(false)

  // 1. Cargar código activo al abrir el modal
  useEffect(() => {
    if (isOpen) {
      const cargarCodigoExistente = async () => {
        setLoading(true)
        const activo = await obtenerCodigoActivo()
        if (activo) {
          setCodigoGenerado(activo)
        }
        setLoading(false)
      }
      cargarCodigoExistente()
    }
  }, [isOpen])

  // 2. Temporizador / Cuenta Regresiva
  useEffect(() => {
    if (!codigoGenerado) return

    const calcularCuentaRegresiva = () => {
      const limite = new Date(codigoGenerado.expiraEn).getTime()
      const ahora = new Date().getTime()
      const diferencia = limite - ahora

      if (diferencia <= 0) {
        // El código venció
        setCodigoGenerado(null)
        setTiempoRestante('')
        return
      }

      const horasRestantes = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutosRestantes = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60))
      const segundosRestantes = Math.floor((diferencia % (1000 * 60)) / 1000)

      setTiempoRestante(
        `${horasRestantes.toString().padStart(2, '0')}:${minutosRestantes
          .toString()
          .padStart(2, '0')}:${segundosRestantes.toString().padStart(2, '0')}`
      )
    }

    calcularCuentaRegresiva()
    const timer = setInterval(calcularCuentaRegresiva, 1000)

    return () => clearInterval(timer)
  }, [codigoGenerado])

  const handleGenerar = async () => {
    setLoading(true)
    const res = await generarCodigoRegistro(horas)
    setLoading(false)

    if (res.success && res.codigo && res.expiraEn) {
      setCodigoGenerado({ codigo: res.codigo, expiraEn: res.expiraEn })
    } else {
      alert(res.error || 'Error al generar código')
    }
  }

  const copiarCodigo = () => {
    if (codigoGenerado) {
      navigator.clipboard.writeText(codigoGenerado.codigo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-[#006C69] hover:bg-[#005250] text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
      >
        <span>🔑</span> Código de Registro
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-gray-800 text-sm">
                Código para Registro de Líderes
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {loading ? (
              <div className="text-center py-6 text-xs text-gray-500">
                Verificando códigos activos...
              </div>
            ) : !codigoGenerado ? (
              <div className="space-y-4">
                <p className="text-xs text-gray-500 leading-relaxed">
                  No hay un código activo en este momento. Genera uno nuevo para permitir el autoregistro.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tiempo de vigencia:
                  </label>
                  <select
                    value={horas}
                    onChange={(e) => setHoras(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-1 focus:ring-[#006C69]"
                  >
                    <option value={2}>2 horas</option>
                    <option value={6}>6 horas (Recomendado)</option>
                    <option value={12}>12 horas</option>
                    <option value={24}>24 horas</option>
                  </select>
                </div>

                <button
                  onClick={handleGenerar}
                  disabled={loading}
                  className="w-full bg-[#006C69] hover:bg-[#005250] text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  Generar Código Ahora
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-center py-2">
                <span className="text-xs text-gray-500 font-medium block">
                  Código activo para tu iglesia:
                </span>

                <div className="bg-emerald-50/50 border-2 border-dashed border-[#006C69]/40 rounded-xl p-3">
                  <span className="text-2xl font-black text-[#006C69] tracking-wider block">
                    {codigoGenerado.codigo}
                  </span>
                </div>

                {/* Cuenta regresiva en tiempo real */}
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider block">
                    Tiempo restante para expirar:
                  </span>
                  <span className="text-lg font-mono font-bold text-amber-900 block">
                    ⏰ {tiempoRestante || '00:00:00'}
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={copiarCodigo}
                    className="flex-1 bg-gray-900 hover:bg-black text-white text-xs font-bold py-2.5 rounded-xl transition"
                  >
                    {copiado ? '✓ ¡Copiado!' : '📋 Copiar Código'}
                  </button>
                  <button
                    onClick={() => setCodigoGenerado(null)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-2.5 rounded-xl transition"
                    title="Generar un nuevo código (reemplazará el anterior)"
                  >
                    Nuevo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}