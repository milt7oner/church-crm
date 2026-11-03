'use server'

import { revalidatePath } from 'next/cache'
import { getPerfilActual } from '@/lib/auth/perfil'
import { mensajeErrorDb, textoOpcional } from '@/lib/form'
import { esTipoRed, type TipoRed } from '@/lib/redes'
import { esAdmin } from '@/lib/roles'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Perfil } from '@/lib/types'

export type RedInput = { nombre: string; tipo: TipoRed; descripcion?: string | null }

async function actorAdmin(): Promise<Perfil | { error: string }> {
  const actor = await getPerfilActual()
  if (!actor) return { error: 'No autenticado.' }
  if (!esAdmin(actor.rol)) return { error: 'Solo el pastor o un líder admin pueden gestionar redes.' }
  return actor
}

function validarRed(input: RedInput): Required<RedInput> | { error: string } {
  const nombre = textoOpcional(input.nombre)
  if (!nombre) return { error: 'El nombre de la red es obligatorio.' }
  if (!esTipoRed(input.tipo)) return { error: 'Selecciona el tipo de red.' }
  return { nombre, tipo: input.tipo, descripcion: textoOpcional(input.descripcion) }
}

export async function crearRed(input: RedInput): Promise<ActionResult> {
  const actor = await actorAdmin()
  if ('error' in actor) return actor

  const datos = validarRed(input)
  if ('error' in datos) return datos

  const supabase = await createClient()
  const { error } = await supabase.from('redes').insert({ iglesia_id: actor.iglesia_id, ...datos })
  if (error) return { error: mensajeErrorDb(error) }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function actualizarRed(redId: string, input: RedInput): Promise<ActionResult> {
  const actor = await actorAdmin()
  if ('error' in actor) return actor

  const datos = validarRed(input)
  if ('error' in datos) return datos

  const supabase = await createClient()
  const { data, error } = await supabase.from('redes').update(datos).eq('id', redId).select('id')
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
