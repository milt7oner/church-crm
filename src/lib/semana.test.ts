import { describe, expect, it } from 'vitest'
import {
  esSemanaValida,
  etiquetaMarcaTiempo,
  etiquetaSemana,
  hoy,
  inicioSemana,
  semanaActual,
  semanaDesdeParam,
  ultimasSemanas,
} from './semana'

// Tuesday 2026-11-03 10:00 in Bogotá (UTC-5)
const AHORA = new Date('2026-11-03T15:00:00Z')

describe('semana', () => {
  it('uses the Bogotá date, not UTC', () => {
    // 2026-11-09 03:00 UTC is still Sunday 2026-11-08 in Bogotá
    expect(hoy(new Date('2026-11-09T03:00:00Z'))).toBe('2026-11-08')
    expect(semanaActual(new Date('2026-11-09T03:00:00Z'))).toBe('2026-11-02')
  })

  it('maps any day to the Monday of its week', () => {
    expect(inicioSemana('2026-11-02')).toBe('2026-11-02')
    expect(inicioSemana('2026-11-05')).toBe('2026-11-02')
    expect(inicioSemana('2026-11-08')).toBe('2026-11-02')
    expect(inicioSemana('2027-01-01')).toBe('2026-12-28')
  })

  it('validates report weeks', () => {
    expect(esSemanaValida('2026-11-02', AHORA)).toBe(true)
    expect(esSemanaValida('2026-10-26', AHORA)).toBe(true)
    expect(esSemanaValida('2026-11-03', AHORA)).toBe(false) // not a Monday
    expect(esSemanaValida('2026-11-09', AHORA)).toBe(false) // future
    expect(esSemanaValida('2026-02-30', AHORA)).toBe(false) // invalid date
    expect(esSemanaValida(undefined, AHORA)).toBe(false)
  })

  it('falls back to the current week for bad query params', () => {
    expect(semanaDesdeParam('2026-10-26', AHORA)).toBe('2026-10-26')
    expect(semanaDesdeParam('nope', AHORA)).toBe('2026-11-02')
    expect(semanaDesdeParam(undefined, AHORA)).toBe('2026-11-02')
  })

  it('lists recent weeks newest first', () => {
    expect(ultimasSemanas(3, AHORA)).toEqual(['2026-11-02', '2026-10-26', '2026-10-19'])
  })

  it('formats week labels', () => {
    expect(etiquetaSemana('2026-11-02')).toBe('2 – 8 nov 2026')
    expect(etiquetaSemana('2026-10-26')).toBe('26 oct – 1 nov 2026')
    expect(etiquetaSemana('2026-12-28')).toBe('28 dic 2026 – 3 ene 2027')
  })

  it('labels timestamps with the Bogotá date', () => {
    // 03:00 UTC on Nov 5 is still Nov 4 in Bogotá (UTC-5)
    expect(etiquetaMarcaTiempo('2026-11-05T03:00:00Z')).toBe('4 nov 2026')
  })
})
