'use server'

import { revalidatePath } from 'next/cache'
import { getPerfilActual } from '@/lib/auth/perfil'
import { mensajeErrorDb, textoOpcional } from '@/lib/form'
import { puedeGestionarGrupo } from '@/lib/permisos'
import { esFechaIso, hoy } from '@/lib/semana'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'

export type MiembroInput = {
  nombreCompleto: string
  telefono?: string
  direccion?: string
  fechaIngreso?: string
  notas?: string
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

function datosMiembro(input: MiembroInput, nombreCompleto: string) {
  return {
    nombre_completo: nombreCompleto,
    telefono: textoOpcional(input.telefono),
    direccion: textoOpcional(input.direccion),
    fecha_ingreso: esFechaIso(input.fechaIngreso) ? input.fechaIngreso : hoy(),
    notas: textoOpcional(input.notas),
  }
}

async function verificarGrupo(supabase: SupabaseServer, grupoId: string): Promise<string | null> {
  const actor = await getPerfilActual()
  if (!actor) return 'No autenticado.'

  const { data: grupo } = await supabase
    .from('grupos')
    .select('iglesia_id, red_id, lider_grupo_id')
    .eq('id', grupoId)
    .eq('activo', true)
    .maybeSingle()

  if (!grupo || !puedeGestionarGrupo(actor, grupo)) return 'No tienes permisos sobre este grupo.'
  return null
}

async function grupoDelMiembro(supabase: SupabaseServer, miembroId: string): Promise<string | null> {
  const { data } = await supabase.from('miembros').select('grupo_id').eq('id', miembroId).eq('activo', true).maybeSingle()
  return data?.grupo_id ?? null
}

export async function crearMiembro(grupoId: string, input: MiembroInput): Promise<ActionResult> {
  const nombreCompleto = textoOpcional(input.nombreCompleto)
  if (!nombreCompleto) return { error: 'El nombre es obligatorio.' }

  const supabase = await createClient()
  const errorPermiso = await verificarGrupo(supabase, grupoId)
  if (errorPermiso) return { error: errorPermiso }

  const { error } = await supabase.from('miembros').insert({ grupo_id: grupoId, ...datosMiembro(input, nombreCompleto) })
  if (error) return { error: mensajeErrorDb(error) }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function actualizarMiembro(miembroId: string, input: MiembroInput): Promise<ActionResult> {
  const nombreCompleto = textoOpcional(input.nombreCompleto)
  if (!nombreCompleto) return { error: 'El nombre es obligatorio.' }

  const supabase = await createClient()
  const grupoId = await grupoDelMiembro(supabase, miembroId)
  if (!grupoId) return { error: 'El miembro no existe.' }

  const errorPermiso = await verificarGrupo(supabase, grupoId)
  if (errorPermiso) return { error: errorPermiso }

  const { error } = await supabase.from('miembros').update(datosMiembro(input, nombreCompleto)).eq('id', miembroId)
  if (error) return { error: mensajeErrorDb(error) }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function desactivarMiembro(miembroId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const grupoId = await grupoDelMiembro(supabase, miembroId)
  if (!grupoId) return { error: 'El miembro no existe.' }

  const errorPermiso = await verificarGrupo(supabase, grupoId)
  if (errorPermiso) return { error: errorPermiso }

  const { error } = await supabase.from('miembros').update({ activo: false }).eq('id', miembroId)
  if (error) return { error: mensajeErrorDb(error) }

  revalidatePath('/', 'layout')
  return { success: true }
}
