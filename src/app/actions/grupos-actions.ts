'use server'

import { revalidatePath } from 'next/cache'
import { getPerfilActual } from '@/lib/auth/perfil'
import { horaOpcional, mensajeErrorDb, textoOpcional } from '@/lib/form'
import { puedeAdministrarGrupo, puedeGestionarGrupo } from '@/lib/permisos'
import { DIAS_SEMANA } from '@/lib/semana'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Grupo } from '@/lib/types'

export type GrupoInput = {
  nombre: string
  redId?: string | null
  liderGrupoId?: string | null
  direccion?: string
  diaReunion?: string
  horaReunion?: string
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

function detalles(input: GrupoInput) {
  const dia = textoOpcional(input.diaReunion)
  return {
    direccion: textoOpcional(input.direccion),
    dia_reunion: dia && (DIAS_SEMANA as readonly string[]).includes(dia) ? dia : null,
    hora_reunion: horaOpcional(input.horaReunion),
  }
}

async function validarRed(supabase: SupabaseServer, redId: string | null | undefined): Promise<string | null> {
  if (!redId) return 'Selecciona una red.'
  const { data } = await supabase.from('redes').select('id').eq('id', redId).eq('activo', true).maybeSingle()
  return data ? null : 'La red seleccionada no existe.'
}

// The group leader must be an active group leader of the same network.
async function validarLider(supabase: SupabaseServer, liderId: string | null, redId: string): Promise<string | null> {
  if (!liderId) return null
  const { data } = await supabase.from('perfiles').select('rol, red_id, activo').eq('id', liderId).maybeSingle()
  if (!data || !data.activo || data.rol !== 'lider_grupo' || data.red_id !== redId) {
    return 'El líder de grupo seleccionado no pertenece a esa red.'
  }
  return null
}

async function obtenerGrupo(supabase: SupabaseServer, grupoId: string): Promise<Grupo | null> {
  const { data } = await supabase
    .from('grupos')
    .select('id, iglesia_id, red_id, lider_grupo_id, nombre, direccion, dia_reunion, hora_reunion, activo')
    .eq('id', grupoId)
    .eq('activo', true)
    .maybeSingle()
  return (data as Grupo | null) ?? null
}

export async function crearGrupo(input: GrupoInput): Promise<ActionResult> {
  const actor = await getPerfilActual()
  if (!actor) return { error: 'No autenticado.' }

  const redId = actor.rol === 'lider_red' ? actor.red_id : textoOpcional(input.redId)
  if (!redId || !puedeAdministrarGrupo(actor, { iglesia_id: actor.iglesia_id, red_id: redId })) {
    return { error: 'No tienes permisos para crear grupos en esa red.' }
  }

  const nombre = textoOpcional(input.nombre)
  if (!nombre) return { error: 'El nombre del grupo es obligatorio.' }

  const supabase = await createClient()
  const liderId = textoOpcional(input.liderGrupoId)
  const errorValidacion = (await validarRed(supabase, redId)) ?? (await validarLider(supabase, liderId, redId))
  if (errorValidacion) return { error: errorValidacion }

  const { error } = await supabase.from('grupos').insert({
    iglesia_id: actor.iglesia_id,
    red_id: redId,
    lider_grupo_id: liderId,
    nombre,
    ...detalles(input),
  })
  if (error) return { error: mensajeErrorDb(error) }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function actualizarGrupo(grupoId: string, input: GrupoInput): Promise<ActionResult> {
  const actor = await getPerfilActual()
  if (!actor) return { error: 'No autenticado.' }

  const supabase = await createClient()
  const grupo = await obtenerGrupo(supabase, grupoId)
  if (!grupo) return { error: 'El grupo no existe.' }

  const nombre = textoOpcional(input.nombre)
  if (!nombre) return { error: 'El nombre del grupo es obligatorio.' }

  let cambios: Record<string, unknown>

  if (puedeAdministrarGrupo(actor, grupo)) {
    // Network leaders cannot move groups out of their network
    const redId = actor.rol === 'lider_red' ? grupo.red_id : (textoOpcional(input.redId) ?? grupo.red_id)
    const liderId = textoOpcional(input.liderGrupoId)
    const errorValidacion = (await validarRed(supabase, redId)) ?? (await validarLider(supabase, liderId, redId))
    if (errorValidacion) return { error: errorValidacion }
    cambios = { nombre, red_id: redId, lider_grupo_id: liderId, ...detalles(input) }
  } else if (puedeGestionarGrupo(actor, grupo)) {
    // Group leaders only edit the meeting details
    cambios = { nombre, ...detalles(input) }
  } else {
    return { error: 'No tienes permisos para editar este grupo.' }
  }

  const { error } = await supabase.from('grupos').update(cambios).eq('id', grupoId)
  if (error) return { error: mensajeErrorDb(error) }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function desactivarGrupo(grupoId: string): Promise<ActionResult> {
  const actor = await getPerfilActual()
  if (!actor) return { error: 'No autenticado.' }

  const supabase = await createClient()
  const grupo = await obtenerGrupo(supabase, grupoId)
  if (!grupo || !puedeAdministrarGrupo(actor, grupo)) {
    return { error: 'No tienes permisos para desactivar este grupo.' }
  }

  const { error } = await supabase.from('grupos').update({ activo: false }).eq('id', grupoId)
  if (error) return { error: mensajeErrorDb(error) }

  revalidatePath('/', 'layout')
  return { success: true }
}
