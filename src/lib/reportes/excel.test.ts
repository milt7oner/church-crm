import { describe, expect, it } from 'vitest'
import { construirResumen } from '@/lib/estadisticas'
import { DATOS } from '@/test/datosReporte'
import { hojasExcel, nombreArchivo } from './excel'

describe('hojasExcel', () => {
  const resumen = construirResumen(DATOS, '2026-11-02')
  const hojas = hojasExcel(resumen, DATOS, { tipo: 'jovenes', redNombre: null, ahora: new Date('2026-11-04T15:00:00Z') })
  const hoja = (nombre: string) => hojas.find((h) => h.sheet === nombre)!

  it('creates the eight sheets with a frozen bold header row', () => {
    expect(hojas.map((h) => h.sheet)).toEqual([
      'Resumen',
      'Por red',
      'Por grupo',
      'Asistencia semanal',
      'Asistencia por persona',
      'Personas para contactar',
      'Reportes de red',
      'Novedades de grupos',
    ])
    for (const h of hojas) {
      expect(h.stickyRowsCount).toBe(1)
      expect(h.data[0][0]).toMatchObject({ fontWeight: 'bold' })
      expect(h.columns).toHaveLength(h.data[0].length)
    }
  })

  it('writes real dates, percentages as fractions and keeps accents', () => {
    const semanal = hoja('Asistencia semanal').data[1]
    expect(semanal[0]).toMatchObject({ value: new Date('2026-10-26T00:00:00Z'), type: Date, format: 'dd/mm/yyyy' })
    expect(semanal[2]).toBe('Casa Ñuñoa')
    expect(semanal.slice(4, 8)).toEqual([1, 1, 2, 3])

    const porRed = hoja('Por red').data[1]
    expect(porRed[1]).toBe('Jóvenes')
    expect(porRed[10]).toMatchObject({ value: 0.33, format: '0%' }) // 1 of 3 finished weeks

    const resumenFilas = hoja('Resumen').data
    expect(resumenFilas.find((f) => f[0] === 'Tipo de red')?.[1]).toBe('Jóvenes')
  })

  it('names the file after the period', () => {
    expect(nombreArchivo(resumen)).toBe('casas-de-vida_2026-10-12_2026-11-08.xlsx')
  })
})
