import { describe, expect, it } from 'vitest'
import {
  asistenciaPersona,
  asistenciaPorSemana,
  construirResumen,
  cumplimiento,
  periodoDesdeParam,
  personasParaContactar,
  resumenAsistencia,
  seguimientoRed,
  semanasHasta,
  semanasSinReporte,
  tendencia,
  type DatosReporte,
  type GrupoDatos,
  type MiembroDatos,
  type ReporteGrupoDatos,
} from './estadisticas'

const ACTUAL = '2026-11-02'
const SEMANAS = ['2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02']
const ANTERIORES = ['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05']

function grupo(id: string, red_id = 'red-1', created_at = '2026-01-01T00:00:00Z', lider_grupo_id: string | null = `lider-${id}`): GrupoDatos {
  return { id, nombre: id, red_id, lider_grupo_id, created_at }
}

function miembro(id: string, grupo_id = 'g1', fecha_ingreso: string | null = null): MiembroDatos {
  return { id, grupo_id, nombre_completo: id, telefono: null, fecha_ingreso }
}

/** `presentes` attended; everyone else in `lista` missed. */
function reporte(grupo_id: string, semana: string, lista: string[], presentes: string[], visitantes = 0): ReporteGrupoDatos {
  return {
    grupo_id,
    semana,
    fecha_reunion: null,
    tema: null,
    novedades: null,
    visitantes,
    asistencia: lista.map((miembro_id) => ({ miembro_id, asistio: presentes.includes(miembro_id) })),
  }
}

describe('periods', () => {
  it('lists weeks oldest first, ending at the given week', () => {
    expect(semanasHasta(ACTUAL, 4)).toEqual(SEMANAS)
  })

  it('accepts only the offered periods', () => {
    expect(periodoDesdeParam('13')).toBe(13)
    expect(periodoDesdeParam('7')).toBe(4)
    expect(periodoDesdeParam(undefined)).toBe(4)
  })
})

describe('attendance', () => {
  const reportes = [
    reporte('g1', '2026-10-26', ['a', 'b'], ['a', 'b'], 1),
    reporte('g2', '2026-10-26', ['c'], ['c']),
    reporte('g1', '2026-11-02', ['a', 'b'], ['a']),
  ]

  it('adds members and visitors per week and ignores weeks outside the period', () => {
    expect(asistenciaPorSemana(SEMANAS, [...reportes, reporte('g1', '2026-09-14', ['a'], ['a'])])).toEqual([
      { semana: '2026-10-12', miembros: 0, visitantes: 0, reportes: 0 },
      { semana: '2026-10-19', miembros: 0, visitantes: 0, reportes: 0 },
      { semana: '2026-10-26', miembros: 3, visitantes: 1, reportes: 2 },
      { semana: '2026-11-02', miembros: 1, visitantes: 0, reportes: 1 },
    ])
  })

  it('averages only over weeks that have reports', () => {
    expect(resumenAsistencia(SEMANAS, reportes)).toEqual({ reuniones: 3, miembros: 4, visitantes: 1, promedioSemanal: 2.5 })
    expect(resumenAsistencia(SEMANAS, []).promedioSemanal).toBeNull()
  })

  it('describes the trend against the previous period', () => {
    expect(tendencia(12, 10)).toEqual({ diferencia: 2, direccion: 'sube' })
    expect(tendencia(9.5, 10)).toEqual({ diferencia: -0.5, direccion: 'baja' })
    expect(tendencia(10, null)).toBeNull()
  })
})

describe('report compliance', () => {
  it('only expects reports since the group was created', () => {
    const nuevo = grupo('g1', 'red-1', '2026-10-28T15:00:00Z') // created in the week of Oct 26
    expect(cumplimiento([nuevo], [reporte('g1', '2026-10-26', [], [])], SEMANAS)).toEqual({
      entregados: 1,
      esperados: 2,
      porcentaje: 50,
    })
  })

  it('does not count the week in progress as missing until it is reported', () => {
    const g = grupo('g1')
    const previas = SEMANAS.slice(0, 3).map((s) => reporte('g1', s, [], []))
    expect(cumplimiento([g], previas, SEMANAS, ACTUAL)).toEqual({ entregados: 3, esperados: 3, porcentaje: 100 })
    expect(cumplimiento([g], [...previas, reporte('g1', ACTUAL, [], [])], SEMANAS, ACTUAL).esperados).toBe(4)
  })

  it('counts consecutive weeks without a report back from last week', () => {
    const g = grupo('g1')
    const reportes = [reporte('g1', '2026-10-12', [], [])]
    expect(semanasSinReporte(g, reportes, '2026-10-26', ANTERIORES[0])).toBe(2)
    expect(semanasSinReporte(g, [...reportes, reporte('g1', '2026-10-26', [], [])], '2026-10-26', ANTERIORES[0])).toBe(0)
    // Never before the group existed or before the loaded range
    expect(semanasSinReporte(grupo('g1', 'red-1', '2026-10-20T00:00:00Z'), [], '2026-10-26', ANTERIORES[0])).toBe(2)
    expect(semanasSinReporte(g, [], '2026-10-26', ANTERIORES[0])).toBe(7)
  })
})

describe('members', () => {
  const reportes = [
    reporte('g1', '2026-10-12', ['a', 'b'], ['a', 'b']),
    reporte('g1', '2026-10-19', ['a', 'b'], ['b']),
    reporte('g1', '2026-10-26', ['b'], ['b']), // "a" was not on the list that week
    reporte('g1', '2026-11-02', ['a', 'b'], ['b']),
  ]

  it('marks each week and computes the attendance percentage', () => {
    const p = asistenciaPersona(miembro('a'), reportes, SEMANAS)
    expect(p.marcas.map((m) => m.marca)).toEqual(['asistio', 'falto', 'sin-reporte', 'falto'])
    expect(p).toMatchObject({ asistio: 1, falto: 2, porcentaje: 33, faltasSeguidas: 2 })
  })

  it('counts missed meetings in a row, skipping weeks without a report', () => {
    const conHueco = reportes.filter((r) => r.semana !== '2026-10-26')
    expect(asistenciaPersona(miembro('a'), conHueco, SEMANAS).faltasSeguidas).toBe(2)
    expect(asistenciaPersona(miembro('b'), reportes, SEMANAS).faltasSeguidas).toBe(0)
  })

  it('flags people who missed the last two reported meetings', () => {
    const personas = ['a', 'b'].map((id) => asistenciaPersona(miembro(id), reportes, SEMANAS))
    expect(personasParaContactar(personas).map((p) => p.miembro.id)).toEqual(['a'])
  })

  it('has no percentage for someone without reported meetings', () => {
    expect(asistenciaPersona(miembro('z', 'g2'), reportes, SEMANAS)).toMatchObject({ porcentaje: null, faltasSeguidas: 0 })
  })
})

describe('network follow-up', () => {
  it('counts groups followed up at least once in the period', () => {
    const grupos = [grupo('g1'), grupo('g2'), grupo('g3')]
    const reportesRed = [
      { red_id: 'red-1', semana: '2026-10-19', novedades: null, grupos: ['g1', 'g2'] },
      { red_id: 'red-1', semana: '2026-11-02', novedades: null, grupos: ['g1'] },
      { red_id: 'red-1', semana: '2026-09-14', novedades: null, grupos: ['g3'] }, // previous period
    ]
    expect(seguimientoRed(grupos, reportesRed, SEMANAS)).toEqual({ conSeguimiento: 2, total: 3, porcentaje: 67 })
  })
})

describe('construirResumen', () => {
  const datos: DatosReporte = {
    semanas: SEMANAS,
    semanasAnteriores: ANTERIORES,
    redes: [
      { id: 'red-1', nombre: 'Norte', tipo: 'adultos' },
      { id: 'red-2', nombre: 'Juvenil', tipo: 'jovenes' },
    ],
    grupos: [grupo('g1', 'red-1'), grupo('g2', 'red-2', '2026-01-01T00:00:00Z', null)],
    lideres: [
      { id: 'lider-g1', nombre_completo: 'Ana', rol: 'lider_grupo', red_id: 'red-1' },
      { id: 'rl1', nombre_completo: 'Luis', rol: 'lider_red', red_id: 'red-1' },
    ],
    miembros: [miembro('a', 'g1'), miembro('b', 'g1', '2026-10-20'), miembro('c', 'g2', '2026-08-01')],
    reportesGrupo: [
      reporte('g1', '2026-09-21', ['a', 'b'], ['a']),
      reporte('g1', '2026-10-19', ['a', 'b'], ['b'], 2),
      reporte('g1', '2026-10-26', ['a', 'b'], ['b']),
      reporte('g2', '2026-10-12', ['c'], ['c']),
    ],
    reportesRed: [{ red_id: 'red-1', semana: '2026-10-26', novedades: null, grupos: ['g1'] }],
  }
  const resumen = construirResumen(datos, ACTUAL)

  it('summarizes the period and compares it with the previous one', () => {
    expect(resumen.actual).toEqual({ reuniones: 3, miembros: 3, visitantes: 2, promedioSemanal: 1.7 })
    expect(resumen.tendencia).toEqual({ diferencia: 0.7, direccion: 'sube' })
    expect(resumen.cumplimiento).toEqual({ entregados: 3, esperados: 6, porcentaje: 50 })
    expect(resumen.miembrosNuevos).toBe(1)
  })

  it('rolls up per group, network and network type', () => {
    const g1 = resumen.porGrupo.find((f) => f.grupo.id === 'g1')!
    expect(g1).toMatchObject({ lider: 'Ana', miembros: 2, promedio: 2, visitantes: 2, ultimoSeguimiento: '2026-10-26' })
    expect(resumen.porRed.map((r) => [r.red.nombre, r.lider, r.seguimiento.porcentaje])).toEqual([
      ['Norte', 'Luis', 100],
      ['Juvenil', null, 0],
    ])
    expect(resumen.porTipo).toEqual([
      { tipo: 'adultos', grupos: 1, miembros: 2, promedioSemanal: 2 },
      { tipo: 'jovenes', grupos: 1, miembros: 1, promedioSemanal: 1 },
    ])
  })

  it('lists what needs attention', () => {
    expect(resumen.paraContactar.map((p) => p.miembro.id)).toEqual(['a'])
    expect(resumen.redesSinLider.map((r) => r.id)).toEqual(['red-2'])
    expect(resumen.gruposSinLider.map((g) => g.id)).toEqual(['g2'])
    expect(resumen.gruposAtrasados.map((f) => [f.grupo.id, f.semanasSinReporte])).toEqual([['g2', 2]])
  })
})
