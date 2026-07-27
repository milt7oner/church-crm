import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LiderWelcomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: persona } = await supabase
    .from('personas')
    .select('nombre_completo, tipo_persona')
    .eq('auth_user_id', user.id)
    .single()

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
      <div className="bg-white border p-8 rounded-xl shadow-sm text-center max-w-md">
        <h1 className="text-3xl font-bold text-green-700 mb-2">Welcome!</h1>
        <p className="text-lg font-medium text-gray-800 mb-4">
          ¡Hola, {persona?.nombre_completo || 'Líder'}!
        </p>
        <p className="text-sm text-gray-600">
          Has ingresado correctamente con el rol de <strong>Líder de Consolidación</strong>.
        </p>
      </div>
    </div>
  )
}