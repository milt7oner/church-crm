import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: persona } = await supabase
    .from('personas')
    .select('nombre_completo, rol_sistema')
    .eq('auth_user_id', user.id)
    .single()

  const { count: totalPersonas } = await supabase
    .from('personas')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar Superior */}
      <header className="bg-white border-b px-8 py-4 flex justify-between items-center">
        <div>
          <span className="font-bold text-gray-800">Vida Abundante — Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/cambiar-password"
            className="text-sm text-blue-600 hover:underline"
          >
            Cambiar Contraseña
          </Link>
          <LogoutButton />
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Panel de Administración</h1>
        <p className="text-gray-600 mb-6">Bienvenido/a, {persona?.nombre_completo}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total Registrados</h3>
            <p className="text-2xl font-bold">{totalPersonas || 0}</p>
          </div>
        </div>
      </main>
    </div>
  )
}