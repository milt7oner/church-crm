'use client'

import { useTransition } from 'react'
import type { ActionResult } from '@/lib/types'
import { btnDanger } from '@/lib/ui'

type ConfirmButtonProps = {
  label: string
  confirmacion: string
  accion: () => Promise<ActionResult>
  className?: string
}

/** Asks for confirmation, runs a server action and reports its error, if any. */
export default function ConfirmButton({ label, confirmacion, accion, className = btnDanger }: ConfirmButtonProps) {
  const [pending, startTransition] = useTransition()

  const onClick = () => {
    if (!window.confirm(confirmacion)) return
    startTransition(async () => {
      const res = await accion()
      if ('error' in res) window.alert(res.error)
    })
  }

  return (
    <button type="button" onClick={onClick} disabled={pending} className={className}>
      {pending ? 'Procesando...' : label}
    </button>
  )
}
