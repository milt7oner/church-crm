import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import LogoutButton from '@/components/LogoutButton'
import CambiarEstadoBoton from '@/components/CambiarEstadoBoton'
import NuevoConsolidadoModal from '@/components/NuevoConsolidadoModal'

export default async function MisConsolidadosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
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

  const idsNuevos = personasAsignadas?.map((p) => p.id) || []

  // 2. Obtener los subpasos/lecciones completadas de cada persona
  let seguimientosMap: Record<string, number> = {}

  if (idsNuevos.length > 0) {
    const { data: seguimientos } = await supabase
      .from('seguimiento_etapas')
      .select('persona_id, subpasos_completados')
      .in('persona_id', idsNuevos)

    // Sumar lecciones por persona
    seguimientos?.forEach((s) => {
      seguimientosMap[s.persona_id] =
        (seguimientosMap[s.persona_id] || 0) + (s.subpasos_completados || 0)
    })
  }

  // 3. Unir la información para renderizar
  const misNuevos = personasAsignadas?.map((nuevo) => ({
    ...nuevo,
    subpasosCompletados: seguimientosMap[nuevo.id] || 0,
  }))

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Responsivo */}
      <header className="bg-white border-b border-gray-200/80 px-4 sm:px-6 py-3.5 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-2.5">
              <Image
                src="/images/Logo-Negro.png"
                alt="Logo Vida Abundante"
                width={32}
                height={32}
                className="object-contain shrink-0"
                priority
              />
              <div>
                <h1 className="font-bold text-gray-800 text-base leading-tight">
                  Vida Abundante <span className="text-[#006C69] font-normal">— Líder</span>
                </h1>
                <p className="text-xs text-gray-500">Líder: {lider.nombre_completo}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t border-gray-100 sm:border-t-0">
            <Link
              href="/cambiar-password"
              className="text-xs font-semibold text-[#006C69] hover:text-[#005250] hover:underline transition px-2 py-1 rounded-md bg-gray-50 sm:bg-transparent"
            >
              Cambiar Clave
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        {/* Cabecera con título, totalizador y Modal de Creación */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
              Mis Personas Asignadas
            </h2>
            <p className="text-xs text-gray-500">Nuevos creyentes bajo tu acompañamiento</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span className="bg-[#006C69]/10 text-[#006C69] font-bold text-xs px-3 py-2 rounded-xl border border-[#006C69]/20 shrink-0">
              Total: {misNuevos?.length || 0}
            </span>

            {/* 🎯 Componente Modal para que el líder registre nuevos consolidados */}
            <NuevoConsolidadoModal />
          </div>
        </div>

        {/* Tarjetas de Nuevos */}
        {!misNuevos || misNuevos.length === 0 ? (
          <div className="bg-white p-8 sm:p-12 rounded-2xl border border-gray-200 text-center text-gray-400 shadow-sm space-y-3">
            <p className="text-sm">
              Aún no tienes personas nuevas asignadas para consolidación.
            </p>
            <p className="text-xs text-gray-400">
              Usa el botón de arriba para registrar a alguien nuevo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {misNuevos.map((nuevo) => {
              const subpasos = Math.min(5, nuevo.subpasosCompletados)
              const porcentaje = Math.round((subpasos / 5) * 100)
              const esAbandono = nuevo.estado_consolidacion === 'abandono'

              return (
                <div
                  key={nuevo.id}
                  className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 ${
                    esAbandono ? 'border-rose-200 bg-rose-50/20 opacity-80' : 'border-gray-200'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="font-bold text-gray-800 text-base leading-snug">
                        {nuevo.nombre_completo}
                      </h3>

                      {/* 🎯 BOTÓN PARA CAMBIAR EL ESTADO */}
                      <CambiarEstadoBoton
                        personaId={nuevo.id}
                        estadoActual={nuevo.estado_consolidacion}
                      />
                    </div>

                    <p className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
                      <span>📞</span> {nuevo.telefono || 'Sin teléfono'}
                    </p>

                    {/* Barra de Progreso adaptada a 5 lecciones */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-gray-600">
                        <span>Cartilla Inicial</span>
                        <span className="text-[#006C69]">
                          {subpasos} / 5 Lecciones ({porcentaje}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-gray-100">
                        <div
                          className="bg-[#006C69] h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/lider/seguimiento/${nuevo.id}`}
                    className="block text-center w-full bg-[#006C69] text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-[#005250] transition shadow-sm"
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