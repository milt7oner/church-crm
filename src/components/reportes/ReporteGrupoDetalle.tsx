import { etiquetaFecha } from '@/lib/semana'
import { card } from '@/lib/ui'
import { textoEnvio } from './ReporteMeta'

type ReporteGrupoDetalleProps = {
  reporte: {
    fecha_reunion: string | null
    tema: string | null
    novedades: string | null
    visitantes: number
    created_at: string
    updated_at: string
  }
  autor: string | null
  asistencia: { nombre: string; asistio: boolean }[]
}

/** Read-only view of a group report, for everyone except the group leader. */
export default function ReporteGrupoDetalle({ reporte, autor, asistencia }: ReporteGrupoDetalleProps) {
  const asistentes = asistencia.filter((a) => a.asistio).length

  return (
    <div className="space-y-5">
      <section className={`${card} p-4 space-y-3`}>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Fecha de la reunión</dt>
            <dd className="text-gray-800">{reporte.fecha_reunion ? etiquetaFecha(reporte.fecha_reunion) : '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Tema</dt>
            <dd className="text-gray-800">{reporte.tema || '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Asistencia total</dt>
            <dd className="text-gray-800">
              {asistentes + reporte.visitantes} personas ({asistentes} miembros · {reporte.visitantes} visitantes)
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Novedades</dt>
            <dd className="text-gray-800 whitespace-pre-line">{reporte.novedades || 'Sin novedades'}</dd>
          </div>
        </dl>
        <p className="text-xs text-gray-400">{textoEnvio(reporte, autor)}</p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-bold text-gray-700">
          Miembros que asistieron ({asistentes} de {asistencia.length})
        </h3>
        <ListaMarcada items={asistencia.map((a) => ({ titulo: a.nombre, marcado: a.asistio }))} vacio="No hay asistencia registrada." />
      </section>
    </div>
  )
}

/** Read-only counterpart of Checklist. */
export function ListaMarcada({ items, vacio }: { items: { titulo: string; marcado: boolean }[]; vacio: string }) {
  if (!items.length) return <p className="text-xs text-gray-500">{vacio}</p>
  return (
    <ul className="border border-gray-200 rounded-2xl divide-y divide-gray-100 bg-white overflow-hidden">
      {items.map((item, i) => (
        <li key={i} className={`flex items-center gap-3 px-3.5 py-3 ${item.marcado ? 'bg-[#006C69]/5' : ''}`}>
          <span
            aria-hidden
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
              item.marcado ? 'bg-[#006C69] text-white' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {item.marcado ? '✓' : '–'}
          </span>
          <span className={`text-sm ${item.marcado ? 'font-medium text-gray-800' : 'text-gray-500'}`}>{item.titulo}</span>
          <span className="sr-only">{item.marcado ? 'sí' : 'no'}</span>
        </li>
      ))}
    </ul>
  )
}
