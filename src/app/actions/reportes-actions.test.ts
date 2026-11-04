import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Perfil } from '@/lib/types'
import { fakeClient, fakeQuery } from '@/test/supabaseMock'

const mocks = vi.hoisted(() => ({
  actor: null as Perfil | null,
  tables: {} as Record<string, unknown>,
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth/perfil', () => ({ getPerfilActual: async () => mocks.actor }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => fakeClient(mocks.tables as never) }))

import { guardarReporteGrupo, guardarReporteRed } from './reportes-actions'

function perfil(id: string, rol: Perfil['rol'], red_id: string | null = null): Perfil {
  return { id, auth_user_id: `auth-${id}`, iglesia_id: 'iglesia-1', nombre_completo: id, email: null, telefono: null, rol, red_id, activo: true }
}

// Wednesday 2026-11-04 in Bogotá → current week starts Monday 2026-11-02
const AHORA = new Date('2026-11-04T15:00:00Z')

describe('reportes-actions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(AHORA)
    mocks.actor = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('guardarReporteGrupo', () => {
    let reportes: ReturnType<typeof fakeQuery>
    let asistencia: ReturnType<typeof fakeQuery>

    beforeEach(() => {
      reportes = fakeQuery({ data: { id: 'rep-1' } })
      asistencia = fakeQuery({})
      mocks.tables = {
        grupos: fakeQuery({ data: { iglesia_id: 'iglesia-1', red_id: 'red-1', lider_grupo_id: 'g1' } }),
        miembros: fakeQuery({ data: [{ id: 'm1' }, { id: 'm2' }] }),
        reportes_grupo: reportes,
        reportes_grupo_asistencia: asistencia,
      }
    })

    const base = { grupoId: 'grupo-1', semana: '2026-11-02', tema: 'Fe', asistentes: ['m1', 'intruso'] }

    it('records attendance for every active member and ignores unknown ids', async () => {
      mocks.actor = perfil('g1', 'lider_grupo', 'red-1')
      expect(await guardarReporteGrupo({ ...base, fechaReunion: '2026-11-03' })).toEqual({ success: true })
      expect(reportes.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ grupo_id: 'grupo-1', semana: '2026-11-02', fecha_reunion: '2026-11-03', tema: 'Fe' }),
        { onConflict: 'grupo_id,semana' }
      )
      expect(asistencia.upsert).toHaveBeenCalledWith(
        [
          { reporte_id: 'rep-1', miembro_id: 'm1', asistio: true },
          { reporte_id: 'rep-1', miembro_id: 'm2', asistio: false },
        ],
        { onConflict: 'reporte_id,miembro_id' }
      )
    })

    it('drops a meeting date outside the reported week', async () => {
      mocks.actor = perfil('g1', 'lider_grupo', 'red-1')
      await guardarReporteGrupo({ ...base, fechaReunion: '2026-10-20' })
      expect(reportes.upsert).toHaveBeenCalledWith(expect.objectContaining({ fecha_reunion: null }), expect.anything())
    })

    it.each(['2026-11-03', '2026-11-09'])('rejects week %s (not a Monday or in the future)', async (semana) => {
      mocks.actor = perfil('g1', 'lider_grupo', 'red-1')
      expect(await guardarReporteGrupo({ ...base, semana })).toEqual({ error: 'La semana seleccionada no es válida.' })
      expect(reportes.upsert).not.toHaveBeenCalled()
    })

    it.each([
      ['a leader of another group', perfil('g2', 'lider_grupo', 'red-1')],
      ['the network leader', perfil('rl1', 'lider_red', 'red-1')],
      ['an admin', perfil('admin', 'lider_admin')],
      ['the pastor', perfil('pastor', 'pastor')],
    ])('rejects %s (only the group leader files the report)', async (_, actor) => {
      mocks.actor = actor
      expect(await guardarReporteGrupo(base)).toEqual({ error: 'Solo el líder del grupo puede llenar este reporte.' })
      expect(reportes.upsert).not.toHaveBeenCalled()
    })
  })

  describe('guardarReporteRed', () => {
    let reportes: ReturnType<typeof fakeQuery>
    let seguimiento: ReturnType<typeof fakeQuery>

    beforeEach(() => {
      reportes = fakeQuery({ data: { id: 'rr-1' } })
      seguimiento = fakeQuery({})
      mocks.tables = {
        grupos: fakeQuery({ data: [{ id: 'grupo-1' }, { id: 'grupo-2' }] }),
        reportes_red: reportes,
        reportes_red_grupos: seguimiento,
      }
    })

    const base = { redId: 'red-1', semana: '2026-11-02', novedades: 'Todo bien', gruposIds: ['grupo-2', 'grupo-de-otra-red'] }

    it('replaces followed-up groups with the selection inside the network', async () => {
      mocks.actor = perfil('rl1', 'lider_red', 'red-1')
      expect(await guardarReporteRed(base)).toEqual({ success: true })
      expect(seguimiento.delete).toHaveBeenCalled()
      expect(seguimiento.insert).toHaveBeenCalledWith([{ reporte_id: 'rr-1', grupo_id: 'grupo-2' }])
    })

    it.each([
      ['an admin', perfil('admin', 'lider_admin')],
      ['another network leader', perfil('rl2', 'lider_red', 'red-2')],
      ['a group leader', perfil('g1', 'lider_grupo', 'red-1')],
    ])('rejects %s', async (_, actor) => {
      mocks.actor = actor
      expect(await guardarReporteRed(base)).toEqual({ error: 'Solo el líder de la red puede llenar este reporte.' })
      expect(reportes.upsert).not.toHaveBeenCalled()
    })
  })
})
