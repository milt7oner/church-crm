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

import { actualizarGrupo, crearGrupo } from './grupos-actions'

function perfil(id: string, rol: Perfil['rol'], red_id: string | null = null): Perfil {
  return { id, auth_user_id: `auth-${id}`, iglesia_id: 'iglesia-1', nombre_completo: id, email: null, telefono: null, rol, red_id, activo: true }
}

const grupoExistente = {
  id: 'grupo-1',
  iglesia_id: 'iglesia-1',
  red_id: 'red-1',
  lider_grupo_id: 'g1',
  nombre: 'Casa 1',
  direccion: null,
  dia_reunion: null,
  hora_reunion: null,
  activo: true,
}

describe('grupos-actions', () => {
  let grupos: ReturnType<typeof fakeQuery>

  beforeEach(() => {
    mocks.actor = null
    grupos = fakeQuery({ data: grupoExistente })
    mocks.tables = {
      grupos,
      redes: fakeQuery({ data: { id: 'red-1' } }),
      perfiles: fakeQuery({ data: { rol: 'lider_grupo', red_id: 'red-1', activo: true } }),
    }
  })

  it('creates groups of a network leader inside their own network', async () => {
    mocks.actor = perfil('rl1', 'lider_red', 'red-1')
    expect(await crearGrupo({ nombre: 'Casa nueva', redId: 'red-2', liderGrupoId: 'g1' })).toEqual({ success: true })
    expect(grupos.insert).toHaveBeenCalledWith(expect.objectContaining({ red_id: 'red-1', lider_grupo_id: 'g1' }))
  })

  it('does not let a group leader create groups', async () => {
    mocks.actor = perfil('g1', 'lider_grupo', 'red-1')
    expect(await crearGrupo({ nombre: 'x', redId: 'red-1' })).toHaveProperty('error')
    expect(grupos.insert).not.toHaveBeenCalled()
  })

  it('rejects a leader from another network', async () => {
    mocks.actor = perfil('admin', 'lider_admin')
    mocks.tables.perfiles = fakeQuery({ data: { rol: 'lider_grupo', red_id: 'red-2', activo: true } })
    expect(await crearGrupo({ nombre: 'x', redId: 'red-1', liderGrupoId: 'g2' })).toEqual({
      error: 'El líder de grupo seleccionado no pertenece a esa red.',
    })
  })

  it('normalizes meeting details', async () => {
    mocks.actor = perfil('pastor', 'pastor')
    await crearGrupo({ nombre: ' Casa ', redId: 'red-1', diaReunion: 'Funday', horaReunion: '25:00', direccion: '  ' })
    expect(grupos.insert).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'Casa', dia_reunion: null, hora_reunion: null, direccion: null })
    )
  })

  it('limits a group leader to editing meeting details of their group', async () => {
    mocks.actor = perfil('g1', 'lider_grupo', 'red-1')
    const res = await actualizarGrupo('grupo-1', { nombre: 'Casa 1', redId: 'red-2', liderGrupoId: 'g9', diaReunion: 'Jueves' })
    expect(res).toEqual({ success: true })
    const cambios = grupos.update.mock.calls[0][0]
    expect(cambios).toMatchObject({ nombre: 'Casa 1', dia_reunion: 'Jueves' })
    expect(cambios).not.toHaveProperty('red_id')
    expect(cambios).not.toHaveProperty('lider_grupo_id')
  })

  it('rejects edits from a group leader of another group', async () => {
    mocks.actor = perfil('g2', 'lider_grupo', 'red-1')
    expect(await actualizarGrupo('grupo-1', { nombre: 'x' })).toHaveProperty('error')
    expect(grupos.update).not.toHaveBeenCalled()
  })
})
