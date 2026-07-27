'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function actualizarSeguimientoEtapa(params: {
  seguimientoId: string
  personaId: string
  completado: boolean
  subpasosCompletados: number
  notas?: string
}) {
  const supabase = await createClient()

  // 1. Validar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesión no válida' }

  // 2. Obtener el ID de la persona logueada (el líder que registra)
  const { data: personaLider } = await supabase
    .from('personas')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!personaLider) return { error: 'Perfil de líder no encontrado' }

  // 3. Actualizar la fila en seguimiento_etapas
  const fechaCompletado = params.completado ? new Date().toISOString().split('T')[0] : null

  const { error } = await supabase
    .from('seguimiento_etapas')
    .update({
      completado: params.completado,
      subpasos_completados: params.subpasosCompletados,
      notas: params.notas || null,
      fecha_completado: fechaCompletado,
      registrado_por: personaLider.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.seguimientoId)

  if (error) {
    return { error: `Error DB: ${error.message}` }
  }

  revalidatePath(`/lider/seguimiento/${params.personaId}`)
  return { success: true }
}