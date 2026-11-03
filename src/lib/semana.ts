// Week helpers. Reports are keyed by the Monday of their week (ISO date string),
// computed in the church's timezone so late-night reports land in the right week.

const ZONA_HORARIA = 'America/Bogota'
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function parseIso(fecha: string): Date {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function esFechaIso(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false
  return toIso(parseIso(value)) === value
}

/** Today's date (YYYY-MM-DD) in the church's timezone. */
export function hoy(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(ahora)
}

export function sumarDias(fecha: string, dias: number): string {
  const date = parseIso(fecha)
  date.setUTCDate(date.getUTCDate() + dias)
  return toIso(date)
}

/** Monday of the week that contains `fecha`. */
export function inicioSemana(fecha: string): string {
  const diaSemana = parseIso(fecha).getUTCDay() // 0 = Sunday
  return sumarDias(fecha, diaSemana === 0 ? -6 : 1 - diaSemana)
}

export function semanaActual(ahora: Date = new Date()): string {
  return inicioSemana(hoy(ahora))
}

/** A valid report week: a Monday that is not in the future. */
export function esSemanaValida(semana: unknown, ahora: Date = new Date()): semana is string {
  return esFechaIso(semana) && inicioSemana(semana) === semana && semana <= semanaActual(ahora)
}

/** Reads `?semana=` and falls back to the current week when missing or invalid. */
export function semanaDesdeParam(param: string | string[] | undefined, ahora: Date = new Date()): string {
  const value = Array.isArray(param) ? param[0] : param
  return esSemanaValida(value, ahora) ? value : semanaActual(ahora)
}

/** Most recent weeks first, starting with the current one. */
export function ultimasSemanas(cantidad: number, ahora: Date = new Date()): string[] {
  const actual = semanaActual(ahora)
  return Array.from({ length: cantidad }, (_, i) => sumarDias(actual, -7 * i))
}

/** e.g. "2 – 8 nov 2026" or "28 dic – 3 ene 2027". */
export function etiquetaSemana(semana: string): string {
  const inicio = parseIso(semana)
  const fin = parseIso(sumarDias(semana, 6))
  const mesInicio = MESES[inicio.getUTCMonth()]
  const mesFin = MESES[fin.getUTCMonth()]
  const anioFin = fin.getUTCFullYear()

  if (inicio.getUTCFullYear() !== anioFin) {
    return `${inicio.getUTCDate()} ${mesInicio} ${inicio.getUTCFullYear()} – ${fin.getUTCDate()} ${mesFin} ${anioFin}`
  }
  if (mesInicio !== mesFin) {
    return `${inicio.getUTCDate()} ${mesInicio} – ${fin.getUTCDate()} ${mesFin} ${anioFin}`
  }
  return `${inicio.getUTCDate()} – ${fin.getUTCDate()} ${mesFin} ${anioFin}`
}

/** e.g. "3 nov 2026". */
export function etiquetaFecha(fecha: string): string {
  const date = parseIso(fecha)
  return `${date.getUTCDate()} ${MESES[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}
