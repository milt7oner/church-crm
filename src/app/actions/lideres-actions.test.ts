import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Perfil } from '@/lib/types'
import { fakeClient, fakeQuery } from '@/test/supabaseMock'

const mocks = vi.hoisted(() => ({
  actor: null as Perfil | null,
  adminTables: {} as Record<string, unknown>,
  serverTables: {} as Record<string, unknown>,
  auth: {
    createUser: vi.fn(),
    deleteUser: vi.fn(),
    updateUserById: vi.fn(),
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth/perfil', () => ({
  PERFIL_COLUMNS: '*',
  getPerfilActual: async () => mocks.actor,
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    ...fakeClient(mocks.adminTables as never),
    auth: { admin: mocks.auth },
  }),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => fakeClient(mocks.serverTables as never),
}))

import { crearLider, desactivarLider, restablecerClaveLider } from './lideres-actions'

function perfil(id: string, rol: Perfil['rol'], red_id: string | null = null): Perfil {
  return {
    id,
    auth_user_id: `auth-${id}`,
    iglesia_id: 'iglesia-1',
    nombre_completo: id,
    email: null,
    telefono: null,
    rol,
    red_id,
    activo: true,
  }
}

const nuevoLider = {
  nombreCompleto: 'Ana Pérez',
  email: 'ana@test.co',
  password: 'secret123',
  rol: 'lider_grupo' as const,
  redId: 'red-2',
}

describe('lideres-actions', () => {
  let perfilesQuery: ReturnType<typeof fakeQuery>

  beforeEach(() => {
    mocks.actor = null
    perfilesQuery = fakeQuery({ error: null })
    mocks.adminTables = { perfiles: perfilesQuery, grupos: fakeQuery({ count: 0 }) }
    mocks.serverTables = { redes: fakeQuery({ data: { id: 'red-1' } }) }
    mocks.auth.createUser.mockReset().mockResolvedValue({ data: { user: { id: 'new-auth-id' } }, error: null })
    mocks.auth.deleteUser.mockReset().mockResolvedValue({ error: null })
    mocks.auth.updateUserById.mockReset().mockResolvedValue({ error: null })
  })

  describe('crearLider', () => {
    it('requires a session with a profile', async () => {
      expect(await crearLider(nuevoLider)).toEqual({ error: 'No autenticado.' })
      expect(mocks.auth.createUser).not.toHaveBeenCalled()
    })

    it('rejects roles above what the actor can create', async () => {
      mocks.actor = perfil('rl1', 'lider_red', 'red-1')
      const res = await crearLider({ ...nuevoLider, rol: 'lider_admin' })
      expect(res).toHaveProperty('error')
      expect(mocks.auth.createUser).not.toHaveBeenCalled()
    })

    it('does not let a group leader create anyone', async () => {
      mocks.actor = perfil('g1', 'lider_grupo', 'red-1')
      expect(await crearLider(nuevoLider)).toHaveProperty('error')
      expect(mocks.auth.createUser).not.toHaveBeenCalled()
    })

    it('forces a network leader to create inside their own network', async () => {
      mocks.actor = perfil('rl1', 'lider_red', 'red-1')
      expect(await crearLider(nuevoLider)).toEqual({ success: true })
      expect(perfilesQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ rol: 'lider_grupo', red_id: 'red-1', iglesia_id: 'iglesia-1', created_by: 'rl1' })
      )
    })

    it('validates the password length before creating the account', async () => {
      mocks.actor = perfil('pastor', 'pastor')
      expect(await crearLider({ ...nuevoLider, password: '123' })).toHaveProperty('error')
      expect(mocks.auth.createUser).not.toHaveBeenCalled()
    })

    it('removes the Auth user when the profile insert fails', async () => {
      mocks.actor = perfil('pastor', 'pastor')
      mocks.adminTables.perfiles = fakeQuery({ error: { code: '23505', message: 'perfiles_un_lider_por_red' } })
      const res = await crearLider({ ...nuevoLider, rol: 'lider_red', redId: 'red-1' })
      expect(res).toEqual({ error: 'Esa red ya tiene un líder de red activo.' })
      expect(mocks.auth.deleteUser).toHaveBeenCalledWith('new-auth-id')
    })
  })

  describe('desactivarLider', () => {
    it('blocks deactivating a group leader who still has active groups', async () => {
      mocks.actor = perfil('rl1', 'lider_red', 'red-1')
      mocks.adminTables = {
        perfiles: fakeQuery({ data: perfil('g1', 'lider_grupo', 'red-1') }),
        grupos: fakeQuery({ count: 2 }),
      }
      expect(await desactivarLider('g1')).toHaveProperty('error')
      expect(mocks.auth.updateUserById).not.toHaveBeenCalled()
    })

    it('does not let a network leader touch another network', async () => {
      mocks.actor = perfil('rl1', 'lider_red', 'red-1')
      mocks.adminTables.perfiles = fakeQuery({ data: perfil('g2', 'lider_grupo', 'red-2') })
      expect(await desactivarLider('g2')).toEqual({ error: 'No tienes permisos para gestionar a este líder.' })
    })

    it('deactivates the profile and bans the login', async () => {
      mocks.actor = perfil('admin', 'lider_admin')
      mocks.adminTables.perfiles = fakeQuery({ data: perfil('g1', 'lider_grupo', 'red-1') })
      expect(await desactivarLider('g1')).toEqual({ success: true })
      expect(mocks.auth.updateUserById).toHaveBeenCalledWith('auth-g1', { ban_duration: '876000h' })
    })
  })

  describe('restablecerClaveLider', () => {
    it('lets an admin reset a leader in scope', async () => {
      mocks.actor = perfil('admin', 'lider_admin')
      mocks.adminTables.perfiles = fakeQuery({ data: perfil('rl1', 'lider_red', 'red-1') })
      expect(await restablecerClaveLider('rl1', 'nueva123')).toEqual({ success: true })
      expect(mocks.auth.updateUserById).toHaveBeenCalledWith('auth-rl1', { password: 'nueva123' })
    })

    it('does not let an admin reset the pastor', async () => {
      mocks.actor = perfil('admin', 'lider_admin')
      mocks.adminTables.perfiles = fakeQuery({ data: perfil('pastor', 'pastor') })
      expect(await restablecerClaveLider('pastor', 'nueva123')).toHaveProperty('error')
      expect(mocks.auth.updateUserById).not.toHaveBeenCalled()
    })
  })
})
