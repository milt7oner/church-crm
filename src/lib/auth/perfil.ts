import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Rol } from '@/lib/roles'
import type { Perfil } from '@/lib/types'

export const PERFIL_COLUMNS = 'id, auth_user_id, iglesia_id, nombre_completo, email, telefono, rol, red_id, activo'

/** Active profile of the logged-in user, or null. Cached per request. */
export const getPerfilActual = cache(async (): Promise<Perfil | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('perfiles')
    .select(PERFIL_COLUMNS)
    .eq('auth_user_id', user.id)
    .eq('activo', true)
    .maybeSingle()

  return (data as Perfil | null) ?? null
})

/** For pages: redirects when there is no profile or the role is not allowed. */
export async function requirePerfil(roles?: Rol[]): Promise<Perfil> {
  const perfil = await getPerfilActual()
  if (!perfil) redirect('/sin-acceso')
  if (roles && !roles.includes(perfil.rol)) redirect('/inicio')
  return perfil
}
