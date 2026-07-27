'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Server Action para crear una nueva persona (Líder o Nuevo)
export async function crearPersona(formData: {
  nombreCompleto: string
  telefono?: string
  direccion?: string
  tipoPersona: 'nuevo' | 'lider' | 'pastor'
  rolSistema?: 'super_admin' | 'encargado' | 'pastor' | 'lider' | null
  email?: string // Solo para Líder / Pastor
  password?: string // Solo para Líder / Pastor
  liderAsignadoId?: string // Solo para Nuevos
  fechaIngreso?: string // Solo para Nuevos
}) {
  const supabase = await createServerClient()

  // 1. Validar que quien ejecuta la acción sea Pastor/Admin/Encargado
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) return { error: 'No autenticado' }

  const { data: currentPersona } = await supabase
    .from('personas')
    .select('rol_sistema, iglesia_id')
    .eq('auth_user_id', currentUser.id)
    .single()

  const rolesPermitidos = ['super_admin', 'pastor', 'encargado']
  if (!currentPersona || !rolesPermitidos.includes(currentPersona.rol_sistema)) {
    return { error: 'No tienes permisos para registrar personas.' }
  }

  let authUserId: string | null = null

  // 2. Si se está creando un Líder/Pastor, crear primero su cuenta en Supabase Auth
  if (formData.tipoPersona !== 'nuevo' && formData.email && formData.password) {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: true,
    })

    if (authError) {
      return { error: `Error en Auth: ${authError.message}` }
    }

    authUserId = authData.user.id
  }

  // 3. Insertar en la tabla 'personas'
  const { error: insertError } = await supabase.from('personas').insert({
    nombre_completo: formData.nombreCompleto,
    telefono: formData.telefono || null,
    direccion: formData.direccion || null,
    iglesia_id: currentPersona.iglesia_id,
    tipo_persona: formData.tipoPersona,
    rol_sistema: formData.tipoPersona === 'nuevo' ? null : formData.rolSistema || 'lider',
    auth_user_id: authUserId,
    lider_asignado_id: formData.tipoPersona === 'nuevo' ? formData.liderAsignadoId || null : null,
    fecha_ingreso: formData.tipoPersona === 'nuevo' ? formData.fechaIngreso || new Date().toISOString().split('T')[0] : null,
    estado_consolidacion: formData.tipoPersona === 'nuevo' ? 'activo' : null,
  })

  if (insertError) {
    return { error: `Error en la DB: ${insertError.message}` }
  }

  revalidatePath('/admin/personas')
  return { success: true }
}