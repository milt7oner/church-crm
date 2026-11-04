import { etiquetaMarcaTiempo } from '@/lib/semana'

/** "Enviado por Ana el 4 nov 2026 · editado el 6 nov 2026" */
export function textoEnvio(reporte: { created_at: string; updated_at: string }, autor?: string | null): string {
  const enviado = etiquetaMarcaTiempo(reporte.created_at)
  const editado = etiquetaMarcaTiempo(reporte.updated_at)
  return [
    `Enviado${autor ? ` por ${autor}` : ''} el ${enviado}`,
    editado !== enviado ? `editado el ${editado}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}
