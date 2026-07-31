import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardRedirectPage() {
  const supabase = await createClient()

  // 1. Validar autenticación
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Consultar rol del usuario en la tabla personas
  const { data: persona } = await supabase
    .from('personas')
    .select('rol_sistema, tipo_persona')
    .eq('auth_user_id', user.id)
    .single()

  if (!persona) redirect('/login')

  // 3. Redirección según rol de sistema
  const rolesAdmin = ['super_admin', 'pastor', 'encargado']

  if (rolesAdmin.includes(persona.rol_sistema)) {
    redirect('/admin/dashboard')
  } else {
    redirect('/lider/mis-consolidados')
  }
}