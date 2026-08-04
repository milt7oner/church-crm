'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function registrarLiderAutonomo(formData: {
  nombreCompleto: string
  telefono: string
  direccion?: string
  iglesiaId: string
  email: string
  password: string
  codigoRegistro: string
}) {
  const supabase = await createServerClient()

  // 1. Inicializar cliente Admin de Supabase (omite RLS)
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 2. Validar el código de registro (usando el cliente admin o server)
  const { data: codigoData, error: codigoError } = await supabaseAdmin
    .from('codigos_registro')
    .select('*')
    .eq('codigo', formData.codigoRegistro.trim().toUpperCase())
    .single()

  if (codigoError || !codigoData) {
    return { error: 'Código de registro inválido.' }
  }

  // 3. Validar Expiración del código
  const fechaExpiracion = new Date(codigoData.expira_en).getTime()
  if (Date.now() > fechaExpiracion) {
    return { error: 'El código de registro ha expirado. Solicita uno nuevo.' }
  }

  // 4. Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true,
  })

  if (authError) {
    return { error: `Error en la cuenta: ${authError.message}` }
  }

  // 5. Insertar en 'personas' usando 'supabaseAdmin' para omitir el bloqueo de RLS
  const { error: insertError } = await supabaseAdmin.from('personas').insert({
    nombre_completo: formData.nombreCompleto,
    telefono: formData.telefono || null,
    direccion: formData.direccion || null,
    iglesia_id: formData.iglesiaId,
    tipo_persona: 'lider',
    rol_sistema: 'lider',
    auth_user_id: authData.user.id,
    estado_consolidacion: null,
  })

  if (insertError) {
    // Si falla la inserción en 'personas', eliminamos el usuario de Auth para no dejar datos huérfanos
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return { error: `Error en base de datos: ${insertError.message}` }
  }

  return { success: true }
}