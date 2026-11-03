import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockState = vi.hoisted(() => ({
  user: null as { id: string } | null,
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: mockState.user } }),
    },
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
  })

  describe('anonymous user', () => {
    it.each(['/', '/inicio', '/grupos', '/grupos/abc/reporte', '/redes', '/lideres', '/cambiar-password', '/sin-acceso'])(
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

    it.each(['/', '/login'])('redirects %s to /inicio', async (pathname) => {
      expect(await run(pathname)).toEqual({ status: 307, location: '/inicio' })
    })

    it.each(['/inicio', '/grupos/abc', '/redes/abc/reporte', '/lideres'])('lets %s through', async (pathname) => {
      expect(await run(pathname)).toEqual({ status: 200, location: null })
    })
  })
})
