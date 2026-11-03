import { vi } from 'vitest'

type Result = { data?: unknown; error?: unknown; count?: number | null }

/**
 * Minimal chainable stand-in for a Supabase query builder. Every filter returns
 * the same builder; awaiting it (or calling maybeSingle) yields `result`.
 */
export function fakeQuery(result: Result = {}) {
  const resolved = { data: null, error: null, count: null, ...result }
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'neq', 'in', 'order', 'limit', 'insert', 'update', 'upsert', 'delete']) {
    builder[method] = vi.fn(() => builder)
  }
  builder.maybeSingle = vi.fn(async () => resolved)
  builder.single = vi.fn(async () => resolved)
  builder.then = (onFulfilled: (value: typeof resolved) => unknown, onRejected?: (reason: unknown) => unknown) =>
    Promise.resolve(resolved).then(onFulfilled, onRejected)
  return builder as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<typeof resolved>
}

/** A client whose `from(table)` returns the builder registered for that table. */
export function fakeClient(tables: Record<string, ReturnType<typeof fakeQuery>>) {
  return {
    from: vi.fn((table: string) => tables[table] ?? fakeQuery()),
  }
}
