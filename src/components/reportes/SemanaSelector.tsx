'use client'

import { useRouter } from 'next/navigation'
import { input } from '@/lib/ui'

type SemanaSelectorProps = {
  semanas: { value: string; label: string }[]
  actual: string
  basePath: string
}

/** Switches the report form to another week through the `?semana=` param. */
export default function SemanaSelector({ semanas, actual, basePath }: SemanaSelectorProps) {
  const router = useRouter()
  return (
    <select
      aria-label="Semana del reporte"
      value={actual}
      onChange={(e) => router.push(`${basePath}?semana=${e.target.value}`)}
      className={`${input} sm:w-auto`}
    >
      {semanas.map((s, i) => (
        <option key={s.value} value={s.value}>
          {i === 0 ? `Esta semana (${s.label})` : s.label}
        </option>
      ))}
    </select>
  )
}
