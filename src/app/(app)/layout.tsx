import Image from 'next/image'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import { NavLinksDesktop, NavLinksMobile } from '@/components/NavLinks'
import { requirePerfil } from '@/lib/auth/perfil'
import { navegacionPara } from '@/lib/navegacion'
import { ROL_LABEL } from '@/lib/roles'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const perfil = await requirePerfil()
  const items = navegacionPara(perfil)

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 sm:pb-0">
      <header className="bg-white border-b border-gray-200/80 px-4 sm:px-6 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <Link href="/inicio" className="flex items-center gap-2.5 min-w-0">
            <Image
              src="/images/Logo-Negro.png"
              alt="Logo Casa del Rey"
              width={32}
              height={32}
              className="object-contain shrink-0"
              priority
            />
            <div className="min-w-0">
              <h1 className="font-bold text-gray-800 text-sm leading-tight">
                Casas de Vida <span className="text-[#006C69] font-normal">— {ROL_LABEL[perfil.rol]}</span>
              </h1>
              <p className="text-xs text-gray-500 truncate">{perfil.nombre_completo}</p>
            </div>
          </Link>

          <NavLinksDesktop items={items} />

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/cambiar-password"
              className="hidden sm:inline text-xs font-semibold text-[#006C69] hover:underline px-2 py-1"
            >
              Cambiar clave
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">{children}</main>

      <NavLinksMobile items={items} />
    </div>
  )
}
