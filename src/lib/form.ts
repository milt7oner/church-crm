// Small input normalizers shared by server actions.

/** Trimmed text, or null when empty. */
export function textoOpcional(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function emailValido(value: unknown): string | null {
  const email = textoOpcional(value)?.toLowerCase() ?? null
  return email && EMAIL.test(email) ? email : null
}

/** "HH:MM" (24h) or null. */
export function horaOpcional(value: unknown): string | null {
  const hora = textoOpcional(value)
  return hora && /^([01]\d|2[0-3]):[0-5]\d$/.test(hora) ? hora : null
}

export const PASSWORD_MIN = 6

/** Mirrors the reportes_grupo_visitantes_rango check constraint. */
export const VISITANTES_MAX = 500

/** Maps Postgres errors to messages the user can act on. */
export function mensajeErrorDb(error: { code?: string; message: string }): string {
  if (error.message.includes('perfiles_un_lider_por_red')) return 'Esa red ya tiene un líder de red activo.'
  if (error.code === '42501') return 'No tienes permisos para realizar esta acción.'
  return `Error en la base de datos: ${error.message}`
}
