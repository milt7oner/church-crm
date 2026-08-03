import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import EtapaItemCard from '@/components/EtapaItemCard'

export default async function SeguimientoPersonaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: personaId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1. Cargar datos del Nuevo
  const { data: persona } = await supabase
    .from('personas')
    .select('id, nombre_completo, telefono, direccion, fecha_ingreso')
    .eq('id', personaId)
    .single()

  if (!persona) redirect('/lider/mis-consolidados')

  // 2. Cargar el seguimiento enfocado en "Cartilla Conociendo a Jesús"
  const { data: seguimientos } = await supabase
    .from('seguimiento_etapas')
    .select(`
      id,
      completado,
      subpasos_completados,
      notas,
      fecha_completado,
      etapa:etapas_plan (
        id,
        orden,
        nombre,
        descripcion,
        tiene_subpasos,
        total_subpasos
      )
    `)
    .eq('persona_id', personaId)

  // 🎯 Solución al error ts(2339): extraemos y normalizamos el objeto 'etapa'
  const seguimientoCartilla = seguimientos?.find((s: any) => {
    // Si Supabase devuelve 'etapa' como array, tomamos el primer elemento, si no, el objeto directo
    const etapaObj = Array.isArray(s.etapa) ? s.etapa[0] : s.etapa
    return (
      etapaObj?.orden === 1 ||
      etapaObj?.nombre?.toLowerCase().includes('conociendo')
    )
  }) || seguimientos?.[0]

  // Extraemos la etapa del seguimiento seleccionado
  const rawEtapa = seguimientoCartilla
    ? Array.isArray(seguimientoCartilla.etapa)
      ? seguimientoCartilla.etapa[0]
      : seguimientoCartilla.etapa
    : null

  // Formateamos el objeto de la etapa asegurando los campos requeridos
  const etapaCartilla = rawEtapa
    ? {
        orden: rawEtapa.orden ?? 1,
        nombre: 'Cartilla: Conociendo a Jesús',
        descripcion: 'Seguimiento del plan inicial de 5 lecciones de consolidación.',
        tiene_subpasos: true,
        total_subpasos: 5,
      }
    : null

  // Cálculo del progreso (Basado en las 5 lecciones)
  const subpasosActuales = seguimientoCartilla?.subpasos_completados || 0
  const porcentajeTotal = Math.round((subpasosActuales / 5) * 100)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      {/* Header / Nav */}
      <header className="bg-white border-b border-gray-200/80 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link
            href="/lider/mis-consolidados"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006C69] hover:text-[#005250] transition"
          >
            &larr; Volver a mis consolidados
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400 hidden sm:inline">
              Plan Vida Abundante
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
        {/* Banner de la Persona */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#006C69] bg-[#006C69]/10 px-2.5 py-1 rounded-full">
              Ficha de Consolidación
            </span>
            <h1 className="text-2xl font-bold text-gray-800 pt-1">
              {persona.nombre_completo}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 pt-1">
              <span className="flex items-center gap-1">
                📞 {persona.telefono || 'Sin celular'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                📍 {persona.direccion || 'Sin dirección registrada'}
              </span>
            </div>
          </div>

          {/* Widget de Progreso Compacto para 5 lecciones */}
          <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex flex-col justify-between min-w-[220px]">
            <div className="flex justify-between items-center text-xs font-bold text-gray-700 mb-2">
              <span>Avance de Cartilla</span>
              <span className="text-[#006C69]">
                {subpasosActuales} / 5 Lecciones
              </span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-1">
              <div
                className="bg-[#006C69] h-full rounded-full transition-all duration-500"
                style={{ width: `${porcentajeTotal}%` }}
              />
            </div>
            <span className="text-[11px] text-right text-gray-400 font-medium">
              {porcentajeTotal}% Completado
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <h2 className="text-lg font-bold text-gray-800">
            Seguimiento: Conociendo a Jesús
          </h2>
          <span className="text-xs text-gray-500">
            Actualiza las lecciones realizadas
          </span>
        </div>

        {/* Tarjeta de la Cartilla */}
        {seguimientoCartilla && etapaCartilla ? (
          <EtapaItemCard
            seguimientoId={seguimientoCartilla.id}
            personaId={persona.id}
            etapa={etapaCartilla}
            completadoInicial={seguimientoCartilla.completado}
            subpasosIniciales={seguimientoCartilla.subpasos_completados}
            notasIniciales={seguimientoCartilla.notas || ''}
          />
        ) : (
          <div className="bg-white border rounded-xl p-6 text-center text-gray-500 text-sm">
            No se encontró el registro de seguimiento para este consolidado.
          </div>
        )}
      </main>
    </div>
  )
}