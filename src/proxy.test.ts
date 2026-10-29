import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockState = vi.hoisted(() => ({
  user: null as { id: string } | null,
  rolSistema: null as string | null,
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
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

import { proxy } from './proxy'

const BASE_URL = 'http://localhost:3000'

async function run(pathname: string) {
  const response = await proxy(new NextRequest(new URL(pathname, BASE_URL)))
  const location = response.headers.get('location')
  return { status: response.status, location: location ? new URL(location).pathname : null }
}

describe('proxy', () => {
  beforeEach(() => {
    mockState.user = null
    mockState.rolSistema = null
  })

  describe('anonymous user', () => {
    it.each(['/dashboard', '/admin/personas', '/lider/mis-consolidados', '/cambiar-password'])(
      'redirects %s to /login',
      async (pathname) => {
        expect(await run(pathname)).toEqual({ status: 307, location: '/login' })
      }
    )

    it('lets /login through', async () => {
      expect(await run('/login')).toEqual({ status: 200, location: null })
    })
  })

  describe('authenticated user', () => {
    beforeEach(() => {
      mockState.user = { id: 'user-1' }
    })

    it.each(['/', '/login'])('redirects %s to /dashboard', async (pathname) => {
      expect(await run(pathname)).toEqual({ status: 307, location: '/dashboard' })
    })

    it.each(['super_admin', 'pastor', 'encargado'])('allows role %s into /admin', async (rol) => {
      mockState.rolSistema = rol
      expect(await run('/admin/personas')).toEqual({ status: 200, location: null })
    })

    it('sends a leader without an admin role to their area', async () => {
      mockState.rolSistema = 'lider'
      expect(await run('/admin/personas')).toEqual({ status: 307, location: '/lider/mis-consolidados' })
    })

    it('sends a user without a persona record to the leader area', async () => {
      expect(await run('/admin/dashboard')).toEqual({ status: 307, location: '/lider/mis-consolidados' })
    })

    it('lets a leader into /lider routes', async () => {
      mockState.rolSistema = 'lider'
      expect(await run('/lider/mis-consolidados')).toEqual({ status: 200, location: null })
    })
  })
})
