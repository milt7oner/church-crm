'use client'

import { useState, useTransition } from 'react'
import type { ActionResult } from '@/lib/types'

/** Runs a server action from a form and keeps its pending/error state. */
export function useActionForm(onSuccess?: () => void) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const run = (accion: () => Promise<ActionResult>) => {
    setError(null)
    startTransition(async () => {
      const res = await accion()
      if ('error' in res) {
        setError(res.error)
      } else {
        onSuccess?.()
      }
    })
  }

  return { pending, error, setError, run }
}
