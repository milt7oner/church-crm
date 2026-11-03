'use server'

import { revalidatePath } from 'next/cache'
import { getPerfilActual, PERFIL_COLUMNS } from '@/lib/auth/perfil'
import { emailValido, mensajeErrorDb, PASSWORD_MIN, textoOpcional } from '@/lib/form'
import { puedeGestionarLider } from '@/lib/permisos'
import { esRol, rolesQuePuedeCrear, rolRequiereRed, type Rol } from '@/lib/roles'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Perfil } from '@/lib/types'

export type LiderInput = {
  nombreCompleto: string
  telefono?: string
  rol: Rol
  redId?: string | null
}

export type NuevoLiderInput = LiderInput & { email: string; password: string }

// Network leaders can only place people in their own network.
async function resolverRed(actor: Perfil, rol: Rol, redId?: string | null): Promise<{ redId: string | null } | { error: string }> {
  if (!rolRequiereRed(rol)) return { redId: null }

  const red = actor.rol === 'lider_red' ? actor.red_id : redId
  if (!red) return { error: 'Selecciona una red.' }

  const supabase = await createClient()
  const { data } = await supabase.from('redes').select('id').eq('id', red).eq('activo', true).maybeSingle()
  if (!data) return { error: 'La red seleccionada no existe.' }

  return { redId: red }
}

async function obtenerObjetivo(actor: Perfil, perfilId: string): Promise<Perfil | { error: string }> {
  const admin = createAdminClient()
  const { data } = await admin.from('perfiles').select(PERFIL_COLUMNS).eq('id', perfilId).maybeSingle()
  const objetivo = data as Perfil | null

  if (!objetivo || !objetivo.activo || !puedeGestionarLider(actor, objetivo)) {
    return { error: 'No tienes permisos para gestionar a este líder.' }
  }
  return objetivo
}

async function contarGruposActivos(perfilId: string): Promise<number> {
  const admin = createAdminClient()
  const { count } = await admin
    .from('grupos')
    .select('id', { count: 'exact', head: true })
    .eq('lider_grupo_id', perfilId)
    .eq('activo', true)
  return count ?? 0
}

export async function crearLider(input: NuevoLiderInput): Promise<ActionResult> {
  const actor = await getPerfilActual()
  if (!actor) return { error: 'No autenticado.' }

  if (!esRol(input.rol) || !rolesQuePuedeCrear(actor.rol).includes(input.rol)) {
    return { error: 'No tienes permisos para crear ese rol.' }
  }

  const nombreCompleto = textoOpcional(input.nombreCompleto)
  const email = emailValido(input.email)
  if (!nombreCompleto) return { error: 'El nombre es obligatorio.' }
  if (!email) return { error: 'Ingresa un correo válido.' }
  if (typeof input.password !== 'string' || input.password.length < PASSWORD_MIN) {
    return { error: `La contraseña debe tener mínimo ${PASSWORD_MIN} caracteres.` }
  }

  const red = await resolverRed(actor, input.rol, input.redId)
  if ('error' in red) return red

  const admin = createAdminClient()
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  })
  if (authError) return { error: `No se pudo crear la cuenta: ${authError.message}` }

  const { error: insertError } = await admin.from('perfiles').insert({
    auth_user_id: authData.user.id,
    iglesia_id: actor.iglesia_id,
    nombre_completo: nombreCompleto,
    email,
    telefono: textoOpcional(input.telefono),
    rol: input.rol,
    red_id: red.redId,
    created_by: actor.id,
  })

  if (insertError) {
    // Do not leave an Auth user without a profile
    await admin.auth.admin.deleteUser(authData.user.id)
    return { error: mensajeErrorDb(insertError) }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function actualizarLider(perfilId: string, input: LiderInput): Promise<ActionResult> {
  const actor = await getPerfilActual()
  if (!actor) return { error: 'No autenticado.' }

  const objetivo = await obtenerObjetivo(actor, perfilId)
  if ('error' in objetivo) return objetivo

  if (!esRol(input.rol) || !rolesQuePuedeCrear(actor.rol).includes(input.rol)) {
    return { error: 'No tienes permisos para asignar ese rol.' }
  }

  const nombreCompleto = textoOpcional(input.nombreCompleto)
  if (!nombreCompleto) return { error: 'El nombre es obligatorio.' }

  const red = await resolverRed(actor, input.rol, input.redId)
  if ('error' in red) return red

  const cambiaUbicacion = input.rol !== objetivo.rol || red.redId !== objetivo.red_id
  if (objetivo.rol === 'lider_grupo' && cambiaUbicacion && (await contarGruposActivos(objetivo.id)) > 0) {
    return { error: 'Este líder tiene grupos activos. Reasígnalos antes de cambiar su rol o su red.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('perfiles')
    .update({
      nombre_completo: nombreCompleto,
      telefono: textoOpcional(input.telefono),
      rol: input.rol,
      red_id: red.redId,
    })
    .eq('id', objetivo.id)

  if (error) return { error: mensajeErrorDb(error) }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function desactivarLider(perfilId: string): Promise<ActionResult> {
  const actor = await getPerfilActual()
  if (!actor) return { error: 'No autenticado.' }

  const objetivo = await obtenerObjetivo(actor, perfilId)
  if ('error' in objetivo) return objetivo

  if ((await contarGruposActivos(objetivo.id)) > 0) {
    return { error: 'Este líder tiene grupos activos. Reasígnalos o desactívalos primero.' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('perfiles').update({ activo: false }).eq('id', objetivo.id)
  if (error) return { error: mensajeErrorDb(error) }

  // Block the login as well; the profile check alone would only show /sin-acceso
  await admin.auth.admin.updateUserById(objetivo.auth_user_id, { ban_duration: '876000h' })

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function restablecerClaveLider(perfilId: string, nuevaClave: string): Promise<ActionResult> {
  const actor = await getPerfilActual()
  if (!actor) return { error: 'No autenticado.' }

  if (typeof nuevaClave !== 'string' || nuevaClave.length < PASSWORD_MIN) {
    return { error: `La contraseña debe tener mínimo ${PASSWORD_MIN} caracteres.` }
  }

  const objetivo = await obtenerObjetivo(actor, perfilId)
  if ('error' in objetivo) return objetivo

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(objetivo.auth_user_id, { password: nuevaClave })
  if (error) return { error: error.message }

  return { success: true }
}
