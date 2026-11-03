export const TIPOS_RED = ['adultos', 'jovenes', 'ninos'] as const

export type TipoRed = (typeof TIPOS_RED)[number]

export const TIPO_RED_LABEL: Record<TipoRed, string> = {
  adultos: 'Adultos',
  jovenes: 'Jóvenes',
  ninos: 'Niños',
}

export function esTipoRed(value: unknown): value is TipoRed {
  return typeof value === 'string' && (TIPOS_RED as readonly string[]).includes(value)
}
