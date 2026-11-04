import { card } from '@/lib/ui'
import { ListaMarcada } from './ReporteGrupoDetalle'
import { textoEnvio } from './ReporteMeta'

type ReporteRedDetalleProps = {
  reporte: { novedades: string | null; created_at: string; updated_at: string }
  autor: string | null
  grupos: { nombre: string; seguimiento: boolean }[]
}

/** Read-only view of a network report, for the pastor and admin leaders. */
export default function ReporteRedDetalle({ reporte, autor, grupos }: ReporteRedDetalleProps) {
  const conSeguimiento = grupos.filter((g) => g.seguimiento).length

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-sm font-bold text-gray-700">
          Grupos con seguimiento ({conSeguimiento} de {grupos.length})
        </h3>
        <ListaMarcada items={grupos.map((g) => ({ titulo: g.nombre, marcado: g.seguimiento }))} vacio="La red no tiene grupos." />
      </section>

      <section className={`${card} p-4 space-y-2`}>
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Novedades</p>
        <p className="text-sm text-gray-800 whitespace-pre-line">{reporte.novedades || 'Sin novedades'}</p>
        <p className="text-xs text-gray-400">{textoEnvio(reporte, autor)}</p>
      </section>
    </div>
  )
}
