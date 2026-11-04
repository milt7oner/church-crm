'use server'

import { revalidatePath } from 'next/cache'
import { getPerfilActual } from '@/lib/auth/perfil'
import { mensajeErrorDb, textoOpcional } from '@/lib/form'
import { puedeReportarGrupo, puedeReportarRed } from '@/lib/permisos'
import { esFechaIso, esSemanaValida, sumarDias } from '@/lib/semana'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'

export type ReporteGrupoInput = {
  grupoId: string
  semana: string
  fechaReunion?: string
  tema?: string
  novedades?: string
  /** Ids of the members who attended. */
  asistentes: string[]
}

export type ReporteRedInput = {
  redId: string
  semana: string
  novedades?: string
  /** Ids of the groups the network leader followed up on. */
  gruposIds: string[]
}

/** The meeting date must fall inside the reported week. */
function fechaDentroDeSemana(fecha: unknown, semana: string): string | null {
  if (!esFechaIso(fecha)) return null
  return fecha >= semana && fecha <= sumarDias(semana, 6) ? fecha : null
}

export async function guardarReporteGrupo(input: ReporteGrupoInput): Promise<ActionResult> {
  const actor = await getPerfilActual()
  if (!actor) return { error: 'No autenticado.' }
  if (!esSemanaValida(input.semana)) return { error: 'La semana seleccionada no es válida.' }

  const supabase = await createClient()
  const { data: grupo } = await supabase
    .from('grupos')
    .select('iglesia_id, red_id, lider_grupo_id')
    .eq('id', input.grupoId)
    .eq('activo', true)
    .maybeSingle()
  if (!grupo || !puedeReportarGrupo(actor, grupo)) return { error: 'Solo el líder del grupo puede llenar este reporte.' }

  const { data: miembros, error: miembrosError } = await supabase
    .from('miembros')
    .select('id')
    .eq('grupo_id', input.grupoId)
    .eq('activo', true)
  if (miembrosError) return { error: mensajeErrorDb(miembrosError) }

  const { data: reporte, error } = await supabase
    .from('reportes_grupo')
    .upsert(
      {
        grupo_id: input.grupoId,
        semana: input.semana,
        fecha_reunion: fechaDentroDeSemana(input.fechaReunion, input.semana),
        tema: textoOpcional(input.tema),
        novedades: textoOpcional(input.novedades),
        created_by: actor.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'grupo_id,semana' }
    )
    .select('id')
    .single()
  if (error || !reporte) return { error: mensajeErrorDb(error ?? { message: 'No se pudo guardar el reporte.' }) }

  // One row per active member; ids that are not members of this group are ignored
  const asistentes = new Set(input.asistentes)
  const filas = (miembros ?? []).map((m) => ({ reporte_id: reporte.id, miembro_id: m.id, asistio: asistentes.has(m.id) }))
  if (filas.length) {
    const { error: asistenciaError } = await supabase
      .from('reportes_grupo_asistencia')
      .upsert(filas, { onConflict: 'reporte_id,miembro_id' })
    if (asistenciaError) return { error: mensajeErrorDb(asistenciaError) }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function guardarReporteRed(input: ReporteRedInput): Promise<ActionResult> {
  const actor = await getPerfilActual()
  if (!actor) return { error: 'No autenticado.' }
  if (!puedeReportarRed(actor, input.redId)) return { error: 'Solo el líder de la red puede llenar este reporte.' }
  if (!esSemanaValida(input.semana)) return { error: 'La semana seleccionada no es válida.' }

  const supabase = await createClient()
  const { data: grupos, error: gruposError } = await supabase
    .from('grupos')
    .select('id')
    .eq('red_id', input.redId)
    .eq('activo', true)
  if (gruposError) return { error: mensajeErrorDb(gruposError) }

  const { data: reporte, error } = await supabase
    .from('reportes_red')
    .upsert(
      {
        red_id: input.redId,
        semana: input.semana,
        novedades: textoOpcional(input.novedades),
        created_by: actor.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'red_id,semana' }
    )
    .select('id')
    .single()
  if (error || !reporte) return { error: mensajeErrorDb(error ?? { message: 'No se pudo guardar el reporte.' }) }

  // Replace the followed-up groups with the current selection (only groups of this network)
  const seleccion = new Set(input.gruposIds)
  const filas = (grupos ?? []).filter((g) => seleccion.has(g.id)).map((g) => ({ reporte_id: reporte.id, grupo_id: g.id }))

  const { error: borrarError } = await supabase.from('reportes_red_grupos').delete().eq('reporte_id', reporte.id)
  if (borrarError) return { error: mensajeErrorDb(borrarError) }

  if (filas.length) {
    const { error: insertError } = await supabase.from('reportes_red_grupos').insert(filas)
    if (insertError) return { error: mensajeErrorDb(insertError) }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
