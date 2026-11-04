// App-level permission rules. They mirror the RLS policies in
// supabase/migrations so server actions can
// return friendly errors before hitting the database.
import { esAdmin, rolesQuePuedeCrear } from './roles'
import type { Grupo, Perfil } from './types'

type Actor = Pick<Perfil, 'id' | 'iglesia_id' | 'rol' | 'red_id'>
type LiderObjetivo = Pick<Perfil, 'id' | 'iglesia_id' | 'rol' | 'red_id'>
type GrupoScope = Pick<Grupo, 'iglesia_id' | 'red_id' | 'lider_grupo_id'>

/** Whether `actor` may edit, deactivate or reset the password of `objetivo`. */
export function puedeGestionarLider(actor: Actor, objetivo: LiderObjetivo): boolean {
  if (actor.iglesia_id !== objetivo.iglesia_id) return false
  if (actor.id === objetivo.id) return false
  if (!rolesQuePuedeCrear(actor.rol).includes(objetivo.rol)) return false
  if (actor.rol === 'lider_red') return actor.red_id !== null && objetivo.red_id === actor.red_id
  return true
}

/** Create groups, reassign their leader or deactivate them. */
export function puedeAdministrarGrupo(actor: Actor, grupo: Omit<GrupoScope, 'lider_grupo_id'>): boolean {
  if (actor.iglesia_id !== grupo.iglesia_id) return false
  if (esAdmin(actor.rol)) return true
  return actor.rol === 'lider_red' && actor.red_id !== null && grupo.red_id === actor.red_id
}

/** View the group and its reports, edit its details and manage its members. */
export function puedeGestionarGrupo(actor: Actor, grupo: GrupoScope): boolean {
  if (puedeAdministrarGrupo(actor, grupo)) return true
  return actor.iglesia_id === grupo.iglesia_id && grupo.lider_grupo_id === actor.id
}

/** Only the network's own leader files its weekly report. */
export function puedeReportarRed(actor: Actor, redId: string): boolean {
  return actor.rol === 'lider_red' && actor.red_id === redId
}

/** Only the group's own leader files or edits its weekly report; others may only view it. */
export function puedeReportarGrupo(actor: Actor, grupo: GrupoScope): boolean {
  return actor.iglesia_id === grupo.iglesia_id && grupo.lider_grupo_id === actor.id
}
