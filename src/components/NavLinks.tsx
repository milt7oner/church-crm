'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavItem } from '@/lib/navegacion'

function estaActivo(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function NavLinksDesktop({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  return (
    <nav className="hidden sm:flex items-center gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`text-xs font-semibold px-3 py-2 rounded-lg transition ${
            estaActivo(pathname, item.href)
              ? 'bg-[#006C69]/10 text-[#006C69]'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

export function NavLinksMobile({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
              estaActivo(pathname, item.href) ? 'text-[#006C69]' : 'text-gray-500'
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
