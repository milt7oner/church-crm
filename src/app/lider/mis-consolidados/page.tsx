import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default async function MisConsolidadosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lider } = await supabase
    .from('personas')
    .select('id, nombre_completo')
    .eq('auth_user_id', user.id)
    .single()

  if (!lider) redirect('/login')

  // 1. Obtener los nuevos asignados
  const { data: personasAsignadas } = await supabase
    .from('personas')
    .select('id, nombre_completo, telefono, estado_consolidacion, fecha_ingreso')
    .eq('lider_asignado_id', lider.id)
    .order('fecha_ingreso', { ascending: false })

  const idsNuevos = personasAsignadas?.map(p => p.id) || []

  // 2. Obtener el seguimiento de esas personas en una sola consulta
  let seguimientosMap: Record<string, number> = {}

  if (idsNuevos.length > 0) {
    const { data: seguimientos } = await supabase
      .from('seguimiento_etapas')
      .select('persona_id, completado')
      .in('persona_id', idsNuevos)
      .eq('completado', true)

    // Contar cuántas etapas completadas tiene cada persona
    seguimientos?.forEach((s) => {
      seguimientosMap[s.persona_id] = (seguimientosMap[s.persona_id] || 0) + 1
    })
  }

  // 3. Unir la información para renderizar
  const misNuevos = personasAsignadas?.map((nuevo) => ({
    ...nuevo,
    etapasCompletadas: seguimientosMap[nuevo.id] || 0,
  }))
    
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="font-bold text-gray-800 text-lg">Vida Abundante — Líder</h1>
          <p className="text-xs text-gray-500">Líder: {lider.nombre_completo}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/cambiar-password" className="text-xs text-blue-600 hover:underline">
            Cambiar Clave
          </Link>
          <LogoutButton />
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="p-6 max-w-5xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Mis Personas Asignadas</h2>
            <p className="text-sm text-gray-600">Nuevos creyentes bajo tu acompañamiento</p>
          </div>
          <span className="bg-blue-100 text-blue-800 font-semibold text-xs px-3 py-1 rounded-full">
            Total: {misNuevos?.length || 0}
          </span>
        </div>

        {/* Tarjetas de Nuevos */}
        {!misNuevos || misNuevos.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border text-center text-gray-500">
            Aún no tienes personas nuevas asignadas para consolidación.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {misNuevos.map((nuevo) => {
  // 1. Usar directamente el número que ya calculamos
  const etapasCompletadas = nuevo.etapasCompletadas || 0
  
  // 2. Calcular el porcentaje sobre las 8 etapas
  const porcentaje = Math.round((etapasCompletadas / 8) * 100)

  return (
    <div key={nuevo.id} className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-gray-800 text-base">{nuevo.nombre_completo}</h3>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
          {nuevo.estado_consolidacion || 'activo'}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        📞 {nuevo.telefono || 'Sin teléfono'}
      </p>

      {/* Barra de Progreso */}
      <div className="mb-4">
        <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
          <span>Progreso Plan</span>
          <span>{etapasCompletadas} / 8 ({porcentaje}%)</span>
        </div>
        <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${porcentaje}%` }}
          ></div>
        </div>
      </div>

      <Link
        href={`/lider/seguimiento/${nuevo.id}`}
        className="block text-center w-full bg-blue-600 text-white text-xs font-semibold py-2 rounded-lg hover:bg-blue-700 transition"
      >
        Ver y Actualizar Plan
      </Link>
    </div>
  )
})}
          </div>
        )}
      </main>
    </div>
  )
}