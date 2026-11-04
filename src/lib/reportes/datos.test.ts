import { describe, expect, it, vi } from 'vitest'
import { TAMANO_PAGINA, todasLasFilas } from './datos'

describe('todasLasFilas', () => {
  it('keeps requesting pages until one comes back short', async () => {
    const total = TAMANO_PAGINA * 2 + 5
    const pagina = vi.fn(async (desde: number, hasta: number) => ({
      data: Array.from({ length: Math.max(0, Math.min(hasta, total - 1) - desde + 1) }, (_, i) => desde + i),
      error: null,
    }))

    const filas = await todasLasFilas(pagina)

    expect(filas).toHaveLength(total)
    expect(pagina.mock.calls).toEqual([
      [0, TAMANO_PAGINA - 1],
      [TAMANO_PAGINA, TAMANO_PAGINA * 2 - 1],
      [TAMANO_PAGINA * 2, TAMANO_PAGINA * 3 - 1],
    ])
  })

  it('throws on database errors', async () => {
    await expect(todasLasFilas(async () => ({ data: null, error: { message: 'boom' } }))).rejects.toThrow('boom')
  })
})
