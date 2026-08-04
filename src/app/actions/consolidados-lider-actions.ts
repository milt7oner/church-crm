'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function crearConsolidadoPorLider(formData: {
  nombreCompleto: string
  telefono?: string
  direccion?: string
  fechaIngreso?: string
}) {
  const supabase = await createServerClient()

  // 1. Validar autenticación
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()
  if (!currentUser) return { error: 'No autenticado.' }

  // 2. Obtener los datos del líder que ejecuta la acción
  const { data: liderPersona, error: liderError } = await supabase
    .from('personas')
    .select('id, iglesia_id, rol_sistema')
    .eq('auth_user_id', currentUser.id)
    .single()

  if (liderError || !liderPersona) {
    return { error: 'No se encontró la información del líder.' }
  }

  // 3. Insertar el nuevo consolidado vinculado automáticamente al líder
  const { error: insertError } = await supabase.from('personas').insert({
    nombre_completo: formData.nombreCompleto,
    telefono: formData.telefono || null,
    direccion: formData.direccion || null,
    iglesia_id: liderPersona.iglesia_id,         // Hereda la iglesia del líder
    tipo_persona: 'nuevo',                       // Es una persona a consolidar
    rol_sistema: null,                           // No tiene acceso al sistema
    lider_asignado_id: liderPersona.id,          // Asignado automáticamente al líder actual
    fecha_ingreso:
      formData.fechaIngreso || new Date().toISOString().split('T')[0],
    estado_consolidacion: 'activo',             // Estado inicial por defecto
  })

  if (insertError) {
    return { error: `Error en la base de datos: ${insertError.message}` }
  }

  // Revalidar las rutas del líder y admin para refrescar la lista
  revalidatePath('/lider/mis-consolidados')
  revalidatePath('/admin/personas')

  return { success: true }
}