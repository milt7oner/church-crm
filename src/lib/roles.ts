export const ROLES = ['pastor', 'lider_admin', 'lider_red', 'lider_grupo'] as const

export type Rol = (typeof ROLES)[number]

export const ROL_LABEL: Record<Rol, string> = {
  pastor: 'Pastor',
  lider_admin: 'Líder admin',
  lider_red: 'Líder de red',
  lider_grupo: 'Líder de grupo',
}

const ROLES_CREABLES: Record<Rol, Rol[]> = {
  pastor: ['lider_admin', 'lider_red', 'lider_grupo'],
  lider_admin: ['lider_red', 'lider_grupo'],
  lider_red: ['lider_grupo'],
  lider_grupo: [],
}

export function esRol(value: unknown): value is Rol {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

/** Pastor and admin leaders see and manage everything in their church. */
export function esAdmin(rol: Rol): boolean {
  return rol === 'pastor' || rol === 'lider_admin'
}

/** Roles that a user with `rol` may create, edit or deactivate. */
export function rolesQuePuedeCrear(rol: Rol): Rol[] {
  return ROLES_CREABLES[rol]
}

/** Network and group leaders always belong to a network. */
export function rolRequiereRed(rol: Rol): boolean {
  return rol === 'lider_red' || rol === 'lider_grupo'
}
