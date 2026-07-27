import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EtapaItemCard from '@/components/EtapaItemCard'

export default async function SeguimientoPersonaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: personaId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
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
  const seguimientosOrdenados = seguimientos?.sort(
    (a: any, b: any) => a.etapa.orden - b.etapa.orden
  ) || []

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header / Nav */}
      <header className="bg-white border-b px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/lider/mis-consolidados" className="text-xs text-blue-600 font-medium hover:underline">
            ← Volver a mis consolidados
          </Link>
          <span className="text-xs text-gray-500 font-medium">Plan Vida Abundante</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Banner de la Persona */}
        <div className="bg-white border rounded-xl p-6 mb-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">{persona.nombre_completo}</h1>
          <p className="text-sm text-gray-600">
            📞 {persona.telefono || 'Sin celular'} | 📍 {persona.direccion || 'Sin dirección registrada'}
          </p>
        </div>

        <h2 className="text-lg font-bold text-gray-800 mb-4">Etapas de Consolidación (1 al 8)</h2>

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