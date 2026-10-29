import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockState = vi.hoisted(() => ({
  user: null as { id: string } | null,
  rolSistema: null as string | null,
  updateUserById: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: mockState.user } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: mockState.rolSistema ? { rol_sistema: mockState.rolSistema } : null,
          }),
        }),
      }),
    }),
  }),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { admin: { updateUserById: mockState.updateUserById } },
  }),
}))

import { adminResetPassword } from './admin-actions'

describe('adminResetPassword', () => {
  beforeEach(() => {
    mockState.user = null
    mockState.rolSistema = null
    mockState.updateUserById.mockReset().mockResolvedValue({ error: null })
  })

  it('rejects anonymous callers', async () => {
    expect(await adminResetPassword('target', 'secret123')).toEqual({ error: 'No autenticado.' })
    expect(mockState.updateUserById).not.toHaveBeenCalled()
  })

  it('rejects callers without an admin role', async () => {
    mockState.user = { id: 'user-1' }
    mockState.rolSistema = 'lider'

    const result = await adminResetPassword('target', 'secret123')

    expect(result).toHaveProperty('error')
    expect(mockState.updateUserById).not.toHaveBeenCalled()
  })

  it.each(['super_admin', 'pastor', 'encargado'])('lets role %s reset a password', async (rol) => {
    mockState.user = { id: 'user-1' }
    mockState.rolSistema = rol

    expect(await adminResetPassword('target', 'secret123')).toEqual({ success: true })
    expect(mockState.updateUserById).toHaveBeenCalledWith('target', { password: 'secret123' })
  })

  it('returns the Supabase error message on failure', async () => {
    mockState.user = { id: 'user-1' }
    mockState.rolSistema = 'pastor'
    mockState.updateUserById.mockResolvedValue({ error: { message: 'boom' } })

    expect(await adminResetPassword('target', 'secret123')).toEqual({ error: 'boom' })
  })
})
