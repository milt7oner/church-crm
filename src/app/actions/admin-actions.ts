'use server'

import { createClient } from '@supabase/supabase-js'

import { createClient as createServerClient } from '@/lib/supabase/server'

export async function adminResetPassword(targetAuthUserId: string, newPassword: string) {
  // 1. Validar que la persona que ejecuta el action sea Pastor/Admin en la sesión actual
  const supabaseServer = await createServerClient()
  const { data: { user: currentUser } } = await supabaseServer.auth.getUser()

  if (!currentUser) {
    return { error: 'No autenticado.' }
  }

  const { data: currentPersona } = await supabaseServer
    .from('personas')
    .select('rol_sistema')
    .eq('auth_user_id', currentUser.id)
    .single()

  const rolesPermitidos = ['super_admin', 'pastor', 'encargado']
  if (!currentPersona || !rolesPermitidos.includes(currentPersona.rol_sistema)) {
    return { error: 'No tienes permisos de administrador para realizar esta acción.' }
  }

  // 2. Instanciar cliente Supabase Admin con la Service Role Key
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 3. Actualizar la contraseña del usuario objetivo en Supabase Auth
  const { error } = await supabaseAdmin.auth.admin.updateUserById(targetAuthUserId, {
    password: newPassword,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}