// Plain-language wording shared by the report screens and the Excel export.
import type { Periodo, Tendencia } from '@/lib/estadisticas'
import { etiquetaFecha } from '@/lib/semana'

const PERIODO_FRASE: Record<Periodo, string> = {
  4: 'el último mes',
  13: 'los últimos 3 meses',
  26: 'los últimos 6 meses',
}

export function frasePeriodo(periodo: Periodo): string {
  return PERIODO_FRASE[periodo]
}

/** 12.5 → "12,5"; null → "—". */
export function numero(n: number | null): string {
  return n === null ? '—' : n.toLocaleString('es-CO', { maximumFractionDigits: 1 })
}

export function porcentaje(n: number | null): string {
  return n === null ? '—' : `${n}%`
}

/** "2 más que el período anterior", "igual que el período anterior", or null when there is nothing to compare. */
export function textoTendencia(t: Tendencia | null): string | null {
  if (!t) return null
  if (t.direccion === 'igual') return 'igual que el período anterior'
  const n = numero(Math.abs(t.diferencia))
  return `${n} ${t.direccion === 'sube' ? 'más' : 'menos'} que el período anterior`
}

export function flechaTendencia(t: Tendencia | null): string {
  if (!t) return ''
  return t.direccion === 'sube' ? '↑' : t.direccion === 'baja' ? '↓' : '='
}

/** "12 oct" */
export function etiquetaCorta(fecha: string): string {
  return etiquetaFecha(fecha).replace(/ \d{4}$/, '')
}

/** Builds a WhatsApp link for Colombian mobile numbers (10 digits starting with 3) or full international numbers. */
export function enlaceWhatsapp(telefono: string | null): string | null {
  const digitos = (telefono ?? '').replace(/\D/g, '')
  if (digitos.length === 10 && digitos.startsWith('3')) return `https://wa.me/57${digitos}`
  if (digitos.length >= 11) return `https://wa.me/${digitos}`
  return null
}

export function enlaceLlamada(telefono: string | null): string | null {
  const limpio = (telefono ?? '').replace(/[^\d+]/g, '')
  return limpio.length >= 7 ? `tel:${limpio}` : null
}
