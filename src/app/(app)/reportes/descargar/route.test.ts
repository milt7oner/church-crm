import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DATOS } from '@/test/datosReporte'
import type { Perfil } from '@/lib/types'

const mocks = vi.hoisted(() => ({ actor: null as Perfil | null, cargar: vi.fn() }))

vi.mock('@/lib/auth/perfil', () => ({ getPerfilActual: async () => mocks.actor }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }))
vi.mock('@/lib/reportes/datos', () => ({ cargarDatosReporte: mocks.cargar }))

import { GET } from './route'

function perfil(rol: Perfil['rol']): Perfil {
  return { id: 'p', auth_user_id: 'a', iglesia_id: 'i', nombre_completo: 'X', email: null, telefono: null, rol, red_id: null, activo: true }
}

describe('GET /reportes/descargar', () => {
  beforeEach(() => {
    mocks.cargar.mockReset().mockResolvedValue(DATOS)
  })

  it.each([null, 'lider_red', 'lider_grupo'] as const)('rejects %s', async (rol) => {
    mocks.actor = rol ? perfil(rol) : null
    const res = await GET(new Request('http://localhost/reportes/descargar'))
    expect(res.status).toBe(403)
    expect(mocks.cargar).not.toHaveBeenCalled()
  })

  it('returns an .xlsx file for admins, applying the filters', async () => {
    mocks.actor = perfil('lider_admin')
    const res = await GET(new Request('http://localhost/reportes/descargar?periodo=13&tipo=jovenes&red=red-1'))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('spreadsheetml')
    expect(res.headers.get('Content-Disposition')).toMatch(/attachment; filename="casas-de-vida_.+\.xlsx"/)
    expect(mocks.cargar).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ periodo: 13, tipo: 'jovenes', redId: 'red-1' }))

    const bytes = new Uint8Array(await res.arrayBuffer())
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK') // .xlsx is a zip archive
  })
})
