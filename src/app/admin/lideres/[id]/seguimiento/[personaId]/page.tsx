import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default async function AdminReporteConsolidadoPage({
  params,
}: {
  params: Promise<{ id: string; personaId: string }>
}) {
  const { id: liderId, personaId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1. Validar permisos
  const { data: admin } = await supabase
    .from('personas')
    .select('rol_sistema')
    .eq('auth_user_id', user.id)
    .single()

  if (!admin || !['super_admin', 'pastor', 'encargado'].includes(admin.rol_sistema)) {
    redirect('/lider/mis-consolidados')
  }

  // 2. Cargar datos de la persona y del líder
  const { data: persona } = await supabase
    .from('personas')
    .select('id, nombre_completo, telefono, direccion, fecha_ingreso, lider_asignado_id')
    .eq('id', personaId)
    .single()

  if (!persona) redirect(`/admin/lideres/${liderId}`)

  const { data: lider } = await supabase
    .from('personas')
    .select('nombre_completo, telefono')
    .eq('id', liderId)
    .single()

  // 3. Cargar las ETAPAS MAESTRAS
  const { data: etapasMaestras } = await supabase
    .from('etapas_plan')
    .select('*')
    .order('orden', { ascending: true })

  // 4. Cargar los avances guardados
  const { data: seguimientosGuardados } = await supabase
    .from('seguimiento_etapas')
    .select('*')
    .eq('persona_id', personaId)

  // Mapa por etapa_id
  const mapaSeguimientos = new Map(
    seguimientosGuardados?.map((s) => [s.etapa_id, s]) || []
  )

  // Procesar estado exacto según tu BD
  const reporteEtapas = (etapasMaestras || []).map((etapa) => {
    const seguimiento = mapaSeguimientos.get(etapa.id)

    const completado = Boolean(seguimiento?.completado)
    const fechaCompletado = seguimiento?.fecha_completado || null
    const fechaInicio = seguimiento?.fecha_inicio || null
    const subpasos = Number(seguimiento?.subpasos_completados || 0)

    // REGLA DE NEGOCIO: Finalizado si completado es true O si fecha_completado no es null
    const estaFinalizada = completado || fechaCompletado !== null

    // En proceso si tiene subpasos marcados o si tiene fecha de inicio
    const estaEnProceso = !estaFinalizada && (subpasos > 0 || fechaInicio !== null)

    return {
      etapa,
      estaFinalizada,
      estaEnProceso,
      subpasosCompletados: subpasos,
      notas: seguimiento?.notas || '',
      fechaInicio,
      fechaCompletado,
    }
  })

  // Métricas
  const completadasCount = reporteEtapas.filter((e) => e.estaFinalizada).length
  const porcentajeTotal = Math.round((completadasCount / (etapasMaestras?.length || 8)) * 100)

  // Formateador seguro de fechas (ej: 27 de jul. de 2026)
  const formatearFecha = (fechaStr: string | null) => {
    if (!fechaStr) return null
    // Evita desfases de zona horaria concatenando T00:00:00 si es un date puro (YYYY-MM-DD)
    const f = fechaStr.includes('T') ? new Date(fechaStr) : new Date(`${fechaStr}T00:00:00`)
    return f.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16">
      {/* Header Corporativo */}
      <header className="bg-white border-b border-gray-200/80 px-6 py-4 sticky top-0 z-10 shadow-sm print:hidden">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link
            href={`/admin/lideres/${liderId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006C69] hover:text-[#005250] transition"
          >
            &larr; Volver al equipo del líder
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400 hidden sm:inline">
              Reporte de Consolidación
            </span>
            <Image
              src="/images/Logo-Negro.png"
              alt="Logo Vida Abundante"
              width={28}
              height={28}
              className="object-contain"
            />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Encabezado del Reporte */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#006C69] bg-[#006C69]/10 px-2.5 py-1 rounded-full">
                Informe de Avance Individual
              </span>
              <h1 className="text-2xl font-bold text-gray-800 pt-2">{persona.nombre_completo}</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Ingresó el:{' '}
                <span className="font-semibold text-gray-700">
                  {formatearFecha(persona.fecha_ingreso) || 'Sin fecha registrada'}
                </span>
              </p>
            </div>

            {/* Tarjeta de Progreso */}
            <div className="bg-gray-50 border border-gray-200/80 p-4 rounded-xl flex flex-col justify-center min-w-[220px]">
              <div className="flex justify-between items-center text-xs font-bold text-gray-700 mb-1.5">
                <span>Progreso General</span>
                <span className="text-[#006C69] font-extrabold">{completadasCount} de 8 Etapas</span>
              </div>
              <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden mb-1">
                <div
                  className="bg-[#006C69] h-full rounded-full transition-all duration-500"
                  style={{ width: `${porcentajeTotal}%` }}
                />
              </div>
              <span className="text-[11px] text-right text-gray-500 font-medium">
                {porcentajeTotal}% de Cumplimiento
              </span>
            </div>
          </div>

          {/* Ficha de Detalles Generales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
              <span className="text-gray-400 font-medium block mb-1">📞 Teléfono / Celular</span>
              <span className="font-semibold text-gray-800">{persona.telefono || 'No registrado'}</span>
            </div>
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
              <span className="text-gray-400 font-medium block mb-1">📍 Dirección / Barrio</span>
              <span className="font-semibold text-gray-800">{persona.direccion || 'No registrada'}</span>
            </div>
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
              <span className="text-gray-400 font-medium block mb-1">👤 Líder Acompañante</span>
              <span className="font-semibold text-[#006C69]">{lider?.nombre_completo || 'Sin líder asignado'}</span>
            </div>
          </div>
        </div>

        {/* Listado de Etapas */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-base font-bold text-gray-800">Detalle por Etapas del Plan</h2>
            <span className="text-xs text-gray-400 font-medium">Cronología de Acompañamiento</span>
          </div>

          <div className="space-y-3">
            {reporteEtapas.map(
              ({
                etapa,
                estaFinalizada,
                estaEnProceso,
                subpasosCompletados,
                notas,
                fechaInicio,
                fechaCompletado,
              }) => {
                return (
                  <div
                    key={etapa.id}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
                      estaFinalizada
                        ? 'border-emerald-200 bg-emerald-50/10'
                        : estaEnProceso
                        ? 'border-amber-200 bg-amber-50/10'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3 mb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            estaFinalizada
                              ? 'bg-emerald-100 text-emerald-800'
                              : estaEnProceso
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {etapa.orden}
                        </span>
                        <div>
                          <h3 className="font-bold text-gray-800 text-sm">{etapa.nombre}</h3>
                          <p className="text-xs text-gray-500">{etapa.descripcion}</p>
                        </div>
                      </div>

                      {/* Badge de Estado Superior */}
                      <div>
                        {estaFinalizada ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full">
                            ✓ Finalizado
                          </span>
                        ) : estaEnProceso ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/80 px-3 py-1 rounded-full">
                            ⏳ En Proceso ({subpasosCompletados}/{etapa.total_subpasos || 0})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                            Pendiente
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fechas de Seguimiento */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-gray-50/80 p-3 rounded-xl border border-gray-100 mb-3">
                      <div>
                        <span className="text-gray-400 block text-[11px]">Fecha de Inicio de Etapa:</span>
                        <span className="font-semibold text-gray-700">
                          {formatearFecha(fechaInicio) || 'Sin iniciar'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Fecha de Finalización:</span>
                        <span className="font-semibold text-gray-700">
                          {estaFinalizada
                            ? formatearFecha(fechaCompletado) || 'Finalizado'
                            : estaEnProceso
                            ? 'En curso'
                            : 'Pendiente'}
                        </span>
                      </div>
                    </div>

                    {/* Notas del Líder */}
                    <div>
                      <span className="text-[11px] font-bold text-gray-500 block mb-1">
                        📝 Observaciones / Notas del Líder:
                      </span>
                      {notas && notas.trim() !== '' ? (
                        <p className="text-xs text-gray-700 bg-amber-50/50 border border-amber-100 p-3 rounded-xl italic leading-relaxed">
                          "{notas}"
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Sin anotaciones registradas por el líder.</p>
                      )}
                    </div>
                  </div>
                )
              }
            )}
          </div>
        </div>
      </main>
    </div>
  )
}