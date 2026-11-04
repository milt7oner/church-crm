import { describe, expect, it } from 'vitest'
import { puedeAdministrarGrupo, puedeGestionarGrupo, puedeGestionarLider, puedeReportarGrupo, puedeReportarRed } from './permisos'
import { esAdmin, rolesQuePuedeCrear } from './roles'
import type { Rol } from './roles'

const IGLESIA = 'iglesia-1'

function perfil(id: string, rol: Rol, red_id: string | null = null, iglesia_id = IGLESIA) {
  return { id, rol, red_id, iglesia_id }
}

const pastor = perfil('pastor', 'pastor')
const admin = perfil('admin', 'lider_admin')
const liderRed1 = perfil('rl1', 'lider_red', 'red-1')
const liderRed2 = perfil('rl2', 'lider_red', 'red-2')
const liderGrupo1 = perfil('g1', 'lider_grupo', 'red-1')
const liderGrupo2 = perfil('g2', 'lider_grupo', 'red-2')

const grupo1 = { iglesia_id: IGLESIA, red_id: 'red-1', lider_grupo_id: 'g1' }

describe('roles', () => {
  it('defines who can create whom', () => {
    expect(rolesQuePuedeCrear('pastor')).toEqual(['lider_admin', 'lider_red', 'lider_grupo'])
    expect(rolesQuePuedeCrear('lider_admin')).toEqual(['lider_red', 'lider_grupo'])
    expect(rolesQuePuedeCrear('lider_red')).toEqual(['lider_grupo'])
    expect(rolesQuePuedeCrear('lider_grupo')).toEqual([])
  })

  it('treats pastor and admin leaders as admins', () => {
    expect(esAdmin('pastor')).toBe(true)
    expect(esAdmin('lider_admin')).toBe(true)
    expect(esAdmin('lider_red')).toBe(false)
    expect(esAdmin('lider_grupo')).toBe(false)
  })
})

describe('puedeGestionarLider', () => {
  it('lets the pastor manage every leader role', () => {
    expect(puedeGestionarLider(pastor, admin)).toBe(true)
    expect(puedeGestionarLider(pastor, liderRed1)).toBe(true)
    expect(puedeGestionarLider(pastor, liderGrupo2)).toBe(true)
  })

  it('does not let an admin manage another admin or the pastor', () => {
    expect(puedeGestionarLider(admin, perfil('admin-2', 'lider_admin'))).toBe(false)
    expect(puedeGestionarLider(admin, pastor)).toBe(false)
    expect(puedeGestionarLider(admin, liderRed2)).toBe(true)
  })

  it('limits a network leader to group leaders of their own network', () => {
    expect(puedeGestionarLider(liderRed1, liderGrupo1)).toBe(true)
    expect(puedeGestionarLider(liderRed1, liderGrupo2)).toBe(false)
    expect(puedeGestionarLider(liderRed1, liderRed2)).toBe(false)
  })

  it('never allows managing yourself, other churches, or anything as a group leader', () => {
    expect(puedeGestionarLider(pastor, pastor)).toBe(false)
    expect(puedeGestionarLider(pastor, perfil('x', 'lider_grupo', 'red-9', 'iglesia-2'))).toBe(false)
    expect(puedeGestionarLider(liderGrupo1, perfil('g3', 'lider_grupo', 'red-1'))).toBe(false)
  })
})

describe('group permissions', () => {
  it('lets admins and the network leader administer a group', () => {
    expect(puedeAdministrarGrupo(pastor, grupo1)).toBe(true)
    expect(puedeAdministrarGrupo(admin, grupo1)).toBe(true)
    expect(puedeAdministrarGrupo(liderRed1, grupo1)).toBe(true)
    expect(puedeAdministrarGrupo(liderRed2, grupo1)).toBe(false)
    expect(puedeAdministrarGrupo(liderGrupo1, grupo1)).toBe(false)
  })

  it('lets the group leader manage (but not administer) their own group', () => {
    expect(puedeGestionarGrupo(liderGrupo1, grupo1)).toBe(true)
    expect(puedeGestionarGrupo(liderGrupo2, grupo1)).toBe(false)
    expect(puedeGestionarGrupo(liderRed2, grupo1)).toBe(false)
  })

  it('rejects groups from another church', () => {
    expect(puedeGestionarGrupo(pastor, { ...grupo1, iglesia_id: 'iglesia-2' })).toBe(false)
  })
})

describe('puedeReportarRed', () => {
  it('only allows the network own leader', () => {
    expect(puedeReportarRed(liderRed1, 'red-1')).toBe(true)
    expect(puedeReportarRed(liderRed1, 'red-2')).toBe(false)
    expect(puedeReportarRed(pastor, 'red-1')).toBe(false)
    expect(puedeReportarRed(liderGrupo1, 'red-1')).toBe(false)
  })
})

describe('puedeReportarGrupo', () => {
  it('only allows the group own leader; everyone else views', () => {
    expect(puedeReportarGrupo(liderGrupo1, grupo1)).toBe(true)
    expect(puedeReportarGrupo(liderGrupo2, grupo1)).toBe(false)
    expect(puedeReportarGrupo(liderRed1, grupo1)).toBe(false)
    expect(puedeReportarGrupo(admin, grupo1)).toBe(false)
    expect(puedeReportarGrupo(pastor, grupo1)).toBe(false)
    expect(puedeReportarGrupo(liderGrupo1, { ...grupo1, iglesia_id: 'iglesia-2' })).toBe(false)
  })
})
