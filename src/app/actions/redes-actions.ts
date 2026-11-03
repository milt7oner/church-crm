'use server'

import { revalidatePath } from 'next/cache'
import { getPerfilActual } from '@/lib/auth/perfil'
import { mensajeErrorDb, textoOpcional } from '@/lib/form'
import { esAdmin } from '@/lib/roles'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Perfil } from '@/lib/types'

async function actorAdmin(): Promise<Perfil | { error: string }> {
  const actor = await getPerfilActual()
  if (!actor) return { error: 'No autenticado.' }
  if (!esAdmin(actor.rol)) return { error: 'Solo el pastor o un líder admin pueden gestionar redes.' }
  return actor
}

export async function crearRed(nombre: string): Promise<ActionResult> {
  const actor = await actorAdmin()
  if ('error' in actor) return actor

  const nombreLimpio = textoOpcional(nombre)
  if (!nombreLimpio) return { error: 'El nombre de la red es obligatorio.' }

  const supabase = await createClient()
  const { error } = await supabase.from('redes').insert({ iglesia_id: actor.iglesia_id, nombre: nombreLimpio })
  if (error) return { error: mensajeErrorDb(error) }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function actualizarRed(redId: string, nombre: string): Promise<ActionResult> {
  const actor = await actorAdmin()
  if ('error' in actor) return actor

  const nombreLimpio = textoOpcional(nombre)
  if (!nombreLimpio) return { error: 'El nombre de la red es obligatorio.' }

  const supabase = await createClient()
  const { data, error } = await supabase.from('redes').update({ nombre: nombreLimpio }).eq('id', redId).select('id')
  if (error) return { error: mensajeErrorDb(error) }
  if (!data?.length) return { error: 'La red no existe.' }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function desactivarRed(redId: string): Promise<ActionResult> {
  const actor = await actorAdmin()
  if ('error' in actor) return actor

  const supabase = await createClient()
  const [{ count: grupos }, { count: lideres }] = await Promise.all([
    supabase.from('grupos').select('id', { count: 'exact', head: true }).eq('red_id', redId).eq('activo', true),
    supabase.from('perfiles').select('id', { count: 'exact', head: true }).eq('red_id', redId).eq('activo', true),
  ])

  if ((grupos ?? 0) > 0 || (lideres ?? 0) > 0) {
    return { error: 'La red tiene grupos o líderes activos. Reasígnalos antes de desactivarla.' }
  }

  const { data, error } = await supabase.from('redes').update({ activo: false }).eq('id', redId).select('id')
  if (error) return { error: mensajeErrorDb(error) }
  if (!data?.length) return { error: 'La red no existe.' }

  revalidatePath('/', 'layout')
  return { success: true }
}
