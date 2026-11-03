import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Perfil } from '@/lib/types'
import { fakeClient, fakeQuery } from '@/test/supabaseMock'

const mocks = vi.hoisted(() => ({
  actor: null as Perfil | null,
  tables: {} as Record<string, unknown>,
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth/perfil', () => ({ getPerfilActual: async () => mocks.actor }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => fakeClient(mocks.tables as never) }))

import { actualizarRed, crearRed } from './redes-actions'

function perfil(id: string, rol: Perfil['rol'], red_id: string | null = null): Perfil {
  return { id, auth_user_id: `auth-${id}`, iglesia_id: 'iglesia-1', nombre_completo: id, email: null, telefono: null, rol, red_id, activo: true }
}

describe('redes-actions', () => {
  let redes: ReturnType<typeof fakeQuery>

  beforeEach(() => {
    redes = fakeQuery({ data: [{ id: 'red-1' }] })
    mocks.tables = { redes }
    mocks.actor = perfil('admin', 'lider_admin')
  })

  it('creates a network with its type and trimmed description', async () => {
    expect(await crearRed({ nombre: ' Red Norte ', tipo: 'jovenes', descripcion: ' La Esmeralda, Bello Horizonte ' })).toEqual({
      success: true,
    })
    expect(redes.insert).toHaveBeenCalledWith({
      iglesia_id: 'iglesia-1',
      nombre: 'Red Norte',
      tipo: 'jovenes',
      descripcion: 'La Esmeralda, Bello Horizonte',
    })
  })

  it('stores an empty description as null when updating', async () => {
    expect(await actualizarRed('red-1', { nombre: 'Red Norte', tipo: 'ninos', descripcion: '  ' })).toEqual({ success: true })
    expect(redes.update).toHaveBeenCalledWith({ nombre: 'Red Norte', tipo: 'ninos', descripcion: null })
  })

  it('rejects an unknown network type', async () => {
    expect(await crearRed({ nombre: 'Red Norte', tipo: 'otros' as never })).toEqual({ error: 'Selecciona el tipo de red.' })
    expect(redes.insert).not.toHaveBeenCalled()
  })

  it('rejects a network leader', async () => {
    mocks.actor = perfil('rl1', 'lider_red', 'red-1')
    expect(await crearRed({ nombre: 'Red Norte', tipo: 'adultos' })).toHaveProperty('error')
    expect(redes.insert).not.toHaveBeenCalled()
  })
})
