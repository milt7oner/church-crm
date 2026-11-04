import { esAdmin } from './roles'
import type { Perfil } from './types'

export type NavItem = { href: string; label: string; icon: string }

export function navegacionPara(perfil: Pick<Perfil, 'rol' | 'red_id'>): NavItem[] {
  const inicio = { href: '/inicio', label: 'Inicio', icon: '🏠' }
  const reportes = { href: '/reportes', label: 'Reportes', icon: '📊' }

  if (esAdmin(perfil.rol)) {
    return [
      inicio,
      { href: '/redes', label: 'Redes', icon: '🕸️' },
      { href: '/grupos', label: 'Grupos', icon: '🏡' },
      { href: '/lideres', label: 'Líderes', icon: '👥' },
      reportes,
    ]
  }

  if (perfil.rol === 'lider_red') {
    return [
      inicio,
      ...(perfil.red_id ? [{ href: `/redes/${perfil.red_id}`, label: 'Mi red', icon: '🕸️' }] : []),
      { href: '/grupos', label: 'Grupos', icon: '🏡' },
      { href: '/lideres', label: 'Líderes', icon: '👥' },
      reportes,
    ]
  }

  return [inicio, { href: '/grupos', label: 'Mis grupos', icon: '🏡' }, reportes]
}
