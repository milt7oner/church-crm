import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default async function AdminLideresPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1. Obtener únicamente a los líderes de consolidación (excluyendo super_admin y otros roles)
  const { data: lideres, error: errorLideres } = await supabase
    .from('personas')
    .select('id, nombre_completo, telefono, tipo_persona, rol_sistema')
    .eq('tipo_persona', 'lider')
    .or('rol_sistema.is.null,rol_sistema.neq.super_admin') // Excluye super_admin
    .order('nombre_completo', { ascending: true })

  if (errorLideres) {
    console.error('Error cargando líderes:', errorLideres)
  }

  const idsLideres = lideres?.map((l) => l.id) || []

  // 2. Obtener los consolidados asignados a estos líderes
  let conteoMap: Record<string, number> = {}

  if (idsLideres.length > 0) {
    const { data: consolidados } = await supabase
      .from('personas')
      .select('id, lider_asignado_id')
      .in('lider_asignado_id', idsLideres)

    consolidados?.forEach((c) => {
      if (c.lider_asignado_id) {
        conteoMap[c.lider_asignado_id] = (conteoMap[c.lider_asignado_id] || 0) + 1
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      {/* Header con Logo */}
      <header className="bg-white border-b border-gray-200/80 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#006C69] hover:text-[#005250] mb-1 transition"
            >
              &larr; Volver al Panel
            </Link>
            <h1 className="font-bold text-gray-800 text-lg">Super Admin — Cobertura de Líderes</h1>
          </div>

          <Image
            src="/images/Logo-Negro.png"
            alt="Logo Vida Abundante"
            width={36}
            height={36}
            className="object-contain"
            priority
          />
        </div>
      </header>

      {/* Contenido */}
      <main className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Líderes de Consolidación</h2>
            <p className="text-xs text-gray-500">
              Selecciona un líder para supervisar el avance de sus consolidados
            </p>
          </div>
          <span className="bg-[#006C69]/10 text-[#006C69] font-bold text-xs px-3 py-1.5 rounded-full border border-[#006C69]/20">
            Total Líderes: {lideres?.length || 0}
          </span>
        </div>

        {/* Tarjetas de Líderes */}
        {!lideres || lideres.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-gray-400 shadow-sm">
            No se encontraron líderes de consolidación activos.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {lideres.map((lider) => {
              const totalConsolidados = conteoMap[lider.id] || 0

              return (
                <div
                  key={lider.id}
                  className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="font-bold text-gray-800 text-base leading-snug">
                        {lider.nombre_completo}
                      </h3>
                      <span className="text-[10px] bg-[#006C69]/10 text-[#006C69] font-bold px-2 py-0.5 rounded-full uppercase">
                        Líder
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
                      <span>📞</span> {lider.telefono || 'Sin teléfono'}
                    </p>

                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-4 flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">Consolidados asignados:</span>
                      <span className="font-bold text-[#006C69] bg-white px-2.5 py-0.5 rounded-md border border-gray-200 shadow-sm">
                        {totalConsolidados}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/admin/lideres/${lider.id}`}
                    className="block text-center w-full bg-[#006C69] text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-[#005250] transition shadow-sm"
                  >
                    Ver Personas Asignadas &rarr;
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