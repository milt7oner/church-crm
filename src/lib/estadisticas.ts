// Pure report calculations. Inputs are plain rows already scoped by RLS (see
// src/lib/reportes/datos.ts); nothing here touches the database.
import type { TipoRed } from './redes'
import { inicioSemana, sumarDias } from './semana'

export type RedDatos = { id: string; nombre: string; tipo: TipoRed }
export type GrupoDatos = { id: string; nombre: string; red_id: string; lider_grupo_id: string | null; created_at: string }
export type LiderDatos = { id: string; nombre_completo: string; rol: string; red_id: string | null }
export type MiembroDatos = {
  id: string
  grupo_id: string
  nombre_completo: string
  telefono: string | null
  fecha_ingreso: string | null
}
export type ReporteGrupoDatos = {
  grupo_id: string
  semana: string
  fecha_reunion: string | null
  tema: string | null
  novedades: string | null
  visitantes: number
  asistencia: { miembro_id: string; asistio: boolean }[]
}
export type ReporteRedDatos = { red_id: string; semana: string; novedades: string | null; grupos: string[] }

export type DatosReporte = {
  /** Weeks of the period, oldest first. */
  semanas: string[]
  /** The same number of weeks right before the period, oldest first (for trends). */
  semanasAnteriores: string[]
  redes: RedDatos[]
  grupos: GrupoDatos[]
  lideres: LiderDatos[]
  miembros: MiembroDatos[]
  reportesGrupo: ReporteGrupoDatos[]
  reportesRed: ReporteRedDatos[]
}

/** Members who missed this many reported meetings in a row should be contacted. */
export const FALTAS_PARA_CONTACTAR = 2

export const PERIODOS = [
  { semanas: 4, label: 'Último mes' },
  { semanas: 13, label: '3 meses' },
  { semanas: 26, label: '6 meses' },
] as const

export type Periodo = (typeof PERIODOS)[number]['semanas']

export function periodoDesdeParam(param: string | string[] | undefined): Periodo {
  const n = Number(Array.isArray(param) ? param[0] : param)
  return PERIODOS.some((p) => p.semanas === n) ? (n as Periodo) : 4
}

/** `cantidad` weeks ending at `ultima` (inclusive), oldest first. */
export function semanasHasta(ultima: string, cantidad: number): string[] {
  return Array.from({ length: cantidad }, (_, i) => sumarDias(ultima, -7 * (cantidad - 1 - i)))
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export function asistentesDe(reporte: ReporteGrupoDatos): number {
  return reporte.asistencia.filter((a) => a.asistio).length
}

export type SemanaAsistencia = { semana: string; miembros: number; visitantes: number; reportes: number }

/** Attendance per week (members + visitors) over the given reports. */
export function asistenciaPorSemana(semanas: string[], reportes: ReporteGrupoDatos[]): SemanaAsistencia[] {
  const porSemana = new Map(semanas.map((s) => [s, { semana: s, miembros: 0, visitantes: 0, reportes: 0 }]))
  for (const r of reportes) {
    const fila = porSemana.get(r.semana)
    if (!fila) continue
    fila.miembros += asistentesDe(r)
    fila.visitantes += r.visitantes
    fila.reportes += 1
  }
  return semanas.map((s) => porSemana.get(s)!)
}

export type ResumenAsistencia = {
  reuniones: number
  miembros: number
  visitantes: number
  /** Average people per reported week (sum of all groups that reported that week). */
  promedioSemanal: number | null
}

export function resumenAsistencia(semanas: string[], reportes: ReporteGrupoDatos[]): ResumenAsistencia {
  const filas = asistenciaPorSemana(semanas, reportes)
  const conReporte = filas.filter((f) => f.reportes > 0)
  const miembros = filas.reduce((s, f) => s + f.miembros, 0)
  const visitantes = filas.reduce((s, f) => s + f.visitantes, 0)
  return {
    reuniones: filas.reduce((s, f) => s + f.reportes, 0),
    miembros,
    visitantes,
    promedioSemanal: conReporte.length ? redondear((miembros + visitantes) / conReporte.length) : null,
  }
}

export type Tendencia = { diferencia: number; direccion: 'sube' | 'baja' | 'igual' }

export function tendencia(actual: number | null, anterior: number | null): Tendencia | null {
  if (actual === null || anterior === null) return null
  const diferencia = redondear(actual - anterior)
  return { diferencia, direccion: diferencia > 0 ? 'sube' : diferencia < 0 ? 'baja' : 'igual' }
}

// ---------------------------------------------------------------------------
// Report compliance
// ---------------------------------------------------------------------------

/** Weeks of the period in which the group already existed. */
export function semanasEsperadas(grupo: Pick<GrupoDatos, 'created_at'>, semanas: string[]): string[] {
  const desde = inicioSemana(grupo.created_at.slice(0, 10))
  return semanas.filter((s) => s >= desde)
}

export type Cumplimiento = { entregados: number; esperados: number; porcentaje: number | null }

/**
 * Delivered vs expected group reports. The week in progress (`semanaEnCurso`)
 * only counts once its report is in, so a Monday never looks like a miss.
 */
export function cumplimiento(
  grupos: GrupoDatos[],
  reportes: ReporteGrupoDatos[],
  semanas: string[],
  semanaEnCurso?: string
): Cumplimiento {
  const entregadosSet = new Set(reportes.map((r) => `${r.grupo_id}|${r.semana}`))
  let esperados = 0
  let entregados = 0
  for (const g of grupos) {
    for (const s of semanasEsperadas(g, semanas)) {
      const entregado = entregadosSet.has(`${g.id}|${s}`)
      if (s === semanaEnCurso && !entregado) continue
      esperados += 1
      if (entregado) entregados += 1
    }
  }
  return { entregados, esperados, porcentaje: esperados ? Math.round((entregados / esperados) * 100) : null }
}

/**
 * Consecutive weeks without a report, counting back from `ultimaSemana`
 * (normally last week, since the current one may still be in progress), and
 * never before the group existed or before the first loaded week.
 */
export function semanasSinReporte(
  grupo: GrupoDatos,
  reportes: ReporteGrupoDatos[],
  ultimaSemana: string,
  primeraCargada: string
): number {
  const entregadas = new Set(reportes.filter((r) => r.grupo_id === grupo.id).map((r) => r.semana))
  const creado = inicioSemana(grupo.created_at.slice(0, 10))
  const desde = creado > primeraCargada ? creado : primeraCargada
  let faltantes = 0
  for (let s = ultimaSemana; s >= desde; s = sumarDias(s, -7)) {
    if (entregadas.has(s)) break
    faltantes += 1
  }
  return faltantes
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export type MarcaSemana = 'asistio' | 'falto' | 'sin-reporte'

export type AsistenciaPersona = {
  miembro: MiembroDatos
  marcas: { semana: string; marca: MarcaSemana }[]
  asistio: number
  falto: number
  porcentaje: number | null
  /** Reported meetings missed in a row, most recent first. */
  faltasSeguidas: number
}

export function asistenciaPersona(miembro: MiembroDatos, reportes: ReporteGrupoDatos[], semanas: string[]): AsistenciaPersona {
  const delGrupo = reportes.filter((r) => r.grupo_id === miembro.grupo_id)
  const porSemana = new Map(delGrupo.map((r) => [r.semana, r]))

  const marcas = semanas.map((semana) => {
    const fila = porSemana.get(semana)?.asistencia.find((a) => a.miembro_id === miembro.id)
    const marca: MarcaSemana = !fila ? 'sin-reporte' : fila.asistio ? 'asistio' : 'falto'
    return { semana, marca }
  })
  const asistio = marcas.filter((m) => m.marca === 'asistio').length
  const falto = marcas.filter((m) => m.marca === 'falto').length

  // Streak over every loaded report of the group (not only this period), newest first
  let faltasSeguidas = 0
  for (const r of [...delGrupo].sort((a, b) => b.semana.localeCompare(a.semana))) {
    const fila = r.asistencia.find((a) => a.miembro_id === miembro.id)
    if (!fila) continue // member was not on the list that week
    if (fila.asistio) break
    faltasSeguidas += 1
  }

  return {
    miembro,
    marcas,
    asistio,
    falto,
    porcentaje: asistio + falto ? Math.round((asistio / (asistio + falto)) * 100) : null,
    faltasSeguidas,
  }
}

export function personasParaContactar(personas: AsistenciaPersona[]): AsistenciaPersona[] {
  return personas
    .filter((p) => p.faltasSeguidas >= FALTAS_PARA_CONTACTAR)
    .sort((a, b) => b.faltasSeguidas - a.faltasSeguidas || a.miembro.nombre_completo.localeCompare(b.miembro.nombre_completo, 'es'))
}

/** Lowest attendance first; people without data at the end. */
export function ordenarPorAsistencia(personas: AsistenciaPersona[]): AsistenciaPersona[] {
  return [...personas].sort(
    (a, b) =>
      (a.porcentaje ?? 101) - (b.porcentaje ?? 101) ||
      a.miembro.nombre_completo.localeCompare(b.miembro.nombre_completo, 'es')
  )
}

// ---------------------------------------------------------------------------
// Network follow-up
// ---------------------------------------------------------------------------

/** Last week in which the network leader followed up on each group. */
export function ultimoSeguimiento(reportesRed: ReporteRedDatos[]): Map<string, string> {
  const ultimo = new Map<string, string>()
  for (const r of reportesRed) {
    for (const g of r.grupos) {
      if ((ultimo.get(g) ?? '') < r.semana) ultimo.set(g, r.semana)
    }
  }
  return ultimo
}

export type Seguimiento = { conSeguimiento: number; total: number; porcentaje: number | null }

/** Groups followed up at least once during the period. */
export function seguimientoRed(grupos: GrupoDatos[], reportesRed: ReporteRedDatos[], semanas: string[]): Seguimiento {
  const enPeriodo = new Set(semanas)
  const seguidos = new Set(reportesRed.filter((r) => enPeriodo.has(r.semana)).flatMap((r) => r.grupos))
  const conSeguimiento = grupos.filter((g) => seguidos.has(g.id)).length
  return {
    conSeguimiento,
    total: grupos.length,
    porcentaje: grupos.length ? Math.round((conSeguimiento / grupos.length) * 100) : null,
  }
}

// ---------------------------------------------------------------------------
// Rollups used by the pages and the Excel export
// ---------------------------------------------------------------------------

export type FilaGrupo = {
  grupo: GrupoDatos
  red: RedDatos | undefined
  lider: string | null
  miembros: number
  cumplimiento: Cumplimiento
  /** Average people per meeting in the period. */
  promedio: number | null
  tendencia: Tendencia | null
  visitantes: number
  semanasSinReporte: number
  ultimoSeguimiento: string | null
  paraContactar: number
}

export type FilaRed = {
  red: RedDatos
  lider: string | null
  grupos: number
  miembros: number
  promedioSemanal: number | null
  tendencia: Tendencia | null
  visitantes: number
  cumplimiento: Cumplimiento
  seguimiento: Seguimiento
  reportesRed: number
  paraContactar: number
}

export type Resumen = {
  semanas: string[]
  porSemana: SemanaAsistencia[]
  actual: ResumenAsistencia
  anterior: ResumenAsistencia
  tendencia: Tendencia | null
  cumplimiento: Cumplimiento
  seguimiento: Seguimiento
  miembrosActivos: number
  miembrosNuevos: number
  personas: AsistenciaPersona[]
  paraContactar: AsistenciaPersona[]
  porGrupo: FilaGrupo[]
  porRed: FilaRed[]
  porTipo: { tipo: TipoRed; grupos: number; miembros: number; promedioSemanal: number | null }[]
  redesSinLider: RedDatos[]
  gruposSinLider: GrupoDatos[]
  /** Groups that missed the last FALTAS_PARA_CONTACTAR or more weeks. */
  gruposAtrasados: FilaGrupo[]
}

function promedioPorReunion(reportes: ReporteGrupoDatos[]): number | null {
  if (!reportes.length) return null
  return redondear(reportes.reduce((s, r) => s + asistentesDe(r) + r.visitantes, 0) / reportes.length)
}

export function construirResumen(datos: DatosReporte, semanaActual: string): Resumen {
  const { semanas, semanasAnteriores, redes, grupos, lideres, miembros } = datos
  const enPeriodo = new Set(semanas)
  const enAnterior = new Set(semanasAnteriores)
  const reportesPeriodo = datos.reportesGrupo.filter((r) => enPeriodo.has(r.semana))
  const reportesAnteriores = datos.reportesGrupo.filter((r) => enAnterior.has(r.semana))
  const reportesRedPeriodo = datos.reportesRed.filter((r) => enPeriodo.has(r.semana))

  const redPorId = new Map(redes.map((r) => [r.id, r]))
  const nombreLider = new Map(lideres.map((l) => [l.id, l.nombre_completo]))
  const liderDeRed = new Map(lideres.filter((l) => l.rol === 'lider_red').map((l) => [l.red_id, l.nombre_completo]))
  const seguimientoPorGrupo = ultimoSeguimiento(datos.reportesRed)
  const ultimaCompleta = sumarDias(semanaActual, -7)
  const primeraCargada = semanasAnteriores[0] ?? semanas[0]

  const personas = miembros.map((m) => asistenciaPersona(m, datos.reportesGrupo, semanas))
  const paraContactar = personasParaContactar(personas)
  const contactarPorGrupo = contar(paraContactar.map((p) => p.miembro.grupo_id))
  const miembrosPorGrupo = contar(miembros.map((m) => m.grupo_id))

  const porGrupo: FilaGrupo[] = grupos.map((g) => {
    const propios = reportesPeriodo.filter((r) => r.grupo_id === g.id)
    const promedio = promedioPorReunion(propios)
    return {
      grupo: g,
      red: redPorId.get(g.red_id),
      lider: g.lider_grupo_id ? (nombreLider.get(g.lider_grupo_id) ?? null) : null,
      miembros: miembrosPorGrupo.get(g.id) ?? 0,
      cumplimiento: cumplimiento([g], propios, semanas, semanaActual),
      promedio,
      tendencia: tendencia(promedio, promedioPorReunion(reportesAnteriores.filter((r) => r.grupo_id === g.id))),
      visitantes: propios.reduce((s, r) => s + r.visitantes, 0),
      semanasSinReporte: semanasSinReporte(g, datos.reportesGrupo, ultimaCompleta, primeraCargada),
      ultimoSeguimiento: seguimientoPorGrupo.get(g.id) ?? null,
      paraContactar: contactarPorGrupo.get(g.id) ?? 0,
    }
  })

  const porRed: FilaRed[] = redes.map((red) => {
    const gruposRed = grupos.filter((g) => g.red_id === red.id)
    const ids = new Set(gruposRed.map((g) => g.id))
    const actual = resumenAsistencia(semanas, reportesPeriodo.filter((r) => ids.has(r.grupo_id)))
    const anterior = resumenAsistencia(semanasAnteriores, reportesAnteriores.filter((r) => ids.has(r.grupo_id)))
    const propiosRed = reportesRedPeriodo.filter((r) => r.red_id === red.id)
    return {
      red,
      lider: liderDeRed.get(red.id) ?? null,
      grupos: gruposRed.length,
      miembros: miembros.filter((m) => ids.has(m.grupo_id)).length,
      promedioSemanal: actual.promedioSemanal,
      tendencia: tendencia(actual.promedioSemanal, anterior.promedioSemanal),
      visitantes: actual.visitantes,
      cumplimiento: cumplimiento(gruposRed, reportesPeriodo, semanas, semanaActual),
      seguimiento: seguimientoRed(gruposRed, propiosRed, semanas),
      reportesRed: propiosRed.length,
      paraContactar: paraContactar.filter((p) => ids.has(p.miembro.grupo_id)).length,
    }
  })

  const tipos = [...new Set(redes.map((r) => r.tipo))]
  const porTipo = tipos.map((tipo) => {
    const ids = new Set(grupos.filter((g) => redPorId.get(g.red_id)?.tipo === tipo).map((g) => g.id))
    return {
      tipo,
      grupos: ids.size,
      miembros: miembros.filter((m) => ids.has(m.grupo_id)).length,
      promedioSemanal: resumenAsistencia(semanas, reportesPeriodo.filter((r) => ids.has(r.grupo_id))).promedioSemanal,
    }
  })

  const actual = resumenAsistencia(semanas, reportesPeriodo)
  const anterior = resumenAsistencia(semanasAnteriores, reportesAnteriores)
  const desde = semanas[0]
  const hasta = sumarDias(semanas[semanas.length - 1], 6)

  return {
    semanas,
    porSemana: asistenciaPorSemana(semanas, reportesPeriodo),
    actual,
    anterior,
    tendencia: tendencia(actual.promedioSemanal, anterior.promedioSemanal),
    cumplimiento: cumplimiento(grupos, reportesPeriodo, semanas, semanaActual),
    seguimiento: seguimientoRed(grupos, reportesRedPeriodo, semanas),
    miembrosActivos: miembros.length,
    miembrosNuevos: miembros.filter((m) => m.fecha_ingreso && m.fecha_ingreso >= desde && m.fecha_ingreso <= hasta).length,
    personas,
    paraContactar,
    porGrupo,
    porRed,
    porTipo,
    redesSinLider: redes.filter((r) => !liderDeRed.has(r.id)),
    gruposSinLider: grupos.filter((g) => !g.lider_grupo_id),
    gruposAtrasados: porGrupo
      .filter((f) => f.semanasSinReporte >= FALTAS_PARA_CONTACTAR)
      .sort((a, b) => b.semanasSinReporte - a.semanasSinReporte),
  }
}

function contar(claves: string[]): Map<string, number> {
  const mapa = new Map<string, number>()
  for (const k of claves) mapa.set(k, (mapa.get(k) ?? 0) + 1)
  return mapa
}

function redondear(n: number): number {
  return Math.round(n * 10) / 10
}
