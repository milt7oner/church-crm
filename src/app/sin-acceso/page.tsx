import Image from 'next/image'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'
import { getPerfilActual } from '@/lib/auth/perfil'

// Shown to authenticated users without an active Casas de Vida profile
// (e.g. accounts from the previous system or deactivated leaders).
export default async function SinAccesoPage() {
  if (await getPerfilActual()) redirect('/inicio')

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#006C69] p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-5 text-center">
        <Image src="/images/Logo-Negro.png" alt="Logo Casa del Rey" width={56} height={56} className="mx-auto object-contain" />
        <div className="space-y-1">
          <h1 className="font-bold text-gray-800">Sin acceso</h1>
          <p className="text-sm text-gray-500">
            Tu usuario no tiene un perfil activo en Casas de Vida. Comunícate con tu líder o con el pastor.
          </p>
        </div>
        <LogoutButton />
      </div>
    </div>
  )
}
