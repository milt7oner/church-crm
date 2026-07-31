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

  // 2. Cargar el seguimiento de las 8 etapas con el nombre y regla del catálogo etapas_plan
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

  // Ordenar por el orden de la etapa (1 a 8)
  const seguimientosOrdenados =
    seguimientos?.sort((a: any, b: any) => a.etapa.orden - b.etapa.orden) || []

  // Cálculo de progreso general
  const completadasCount = seguimientosOrdenados.filter((s: any) => s.completado).length
  const porcentajeTotal = Math.round((completadasCount / 8) * 100)

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16">
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
            <h1 className="text-2xl font-bold text-gray-800 pt-1">{persona.nombre_completo}</h1>
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

          {/* Widget de Progreso Compacto */}
          <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex flex-col justify-between min-w-[200px]">
            <div className="flex justify-between items-center text-xs font-bold text-gray-700 mb-2">
              <span>Avance Global</span>
              <span className="text-[#006C69]">{completadasCount} / 8</span>
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
          <h2 className="text-lg font-bold text-gray-800">Etapas del Plan (1 al 8)</h2>
          <span className="text-xs text-gray-500">Haz clic para actualizar el progreso</span>
        </div>

        {/* Lista interactiva de Etapas */}
        <div className="space-y-4">
          {seguimientosOrdenados.map((item: any) => (
            <EtapaItemCard
              key={item.id}
              seguimientoId={item.id}
              personaId={persona.id}
              etapa={item.etapa}
              completadoInicial={item.completado}
              subpasosIniciales={item.subpasos_completados}
              notasIniciales={item.notas || ''}
            />
          ))}
        </div>
      </main>
    </div>
  )
}