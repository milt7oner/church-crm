import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import LogoutButton from '@/components/LogoutButton'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: admin } = await supabase
    .from('personas')
    .select('nombre_completo, rol_sistema')
    .eq('auth_user_id', user.id)
    .single()

  if (!admin || !['super_admin', 'pastor', 'encargado'].includes(admin.rol_sistema)) {
    redirect('/lider/mis-consolidados')
  }

  // Contadores rápidos para las tarjetas informativas
  const { count: totalLideres } = await supabase
    .from('personas')
    .select('*', { count: 'exact', head: true })
    .in('tipo_persona', ['lider', 'pastor'])

  const { count: totalNuevos } = await supabase
    .from('personas')
    .select('*', { count: 'exact', head: true })
    .eq('tipo_persona', 'nuevo')

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Corporativo */}
      <header className="bg-white border-b border-gray-200/80 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <Image
            src="/images/Logo-Negro.png"
            alt="Logo Vida Abundante"
            width={36}
            height={36}
            className="object-contain"
            priority
          />
          <div>
            <h1 className="font-bold text-gray-800 text-lg leading-tight">
              Centro Cristiano Casa del Rey <span className="text-[#006C69] font-normal">Popayán</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Bienvenido, <span className="font-semibold text-gray-700">{admin.nombre_completo}</span> ({admin.rol_sistema})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link 
            href="/cambiar-password" 
            className="text-xs font-medium text-[#006C69] hover:text-[#005250] hover:underline transition"
          >
            Cambiar Clave
          </Link>
          <LogoutButton />
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
        
        {/* Resumen de Cifras */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                Líderes de Consolidación
              </p>
              <p className="text-4xl font-extrabold text-[#006C69] mt-2">
                {totalLideres || 0}
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#006C69]/10 text-[#006C69] flex items-center justify-center text-2xl">
              👥
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                Nuevos en Consolidación
              </p>
              <p className="text-4xl font-extrabold text-[#0097A3] mt-2">
                {totalNuevos || 0}
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#0097A3]/10 text-[#0097A3] flex items-center justify-center text-2xl">
              🌱
            </div>
          </div>

        </div>

        {/* Módulos del Sistema */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            Módulos Disponibles
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Módulo: Gestión de Integrantes */}
            <Link
              href="/admin/personas"
              className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#006C69]/10 text-[#006C69] flex items-center justify-center font-bold mb-4 group-hover:bg-[#006C69] group-hover:text-white transition-colors duration-200 text-xl">
                  📋
                </div>
                <h3 className="font-bold text-gray-800 text-base mb-2 group-hover:text-[#006C69] transition-colors">
                  Gestión de Integrantes
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Crear líderes, registrar nuevos creyentes, asignar acompañantes y resetear contraseñas.
                </p>
              </div>
              <span className="text-xs text-[#006C69] font-semibold mt-6 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Ingresar al módulo &rarr;
              </span>
            </Link>

            {/* Módulo: Supervisión de Líderes (Actualizado) */}
            <Link
              href="/admin/lideres"
              className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#0097A3]/10 text-[#0097A3] flex items-center justify-center font-bold mb-4 group-hover:bg-[#0097A3] group-hover:text-white transition-colors duration-200 text-xl">
                  🎯
                </div>
                <h3 className="font-bold text-gray-800 text-base mb-2 group-hover:text-[#0097A3] transition-colors">
                  Supervisión de Líderes
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Supervisar el avance de cada líder, ver sus personas asignadas y consultar el progreso del plan de 8 etapas.
                </p>
              </div>
              <span className="text-xs text-[#0097A3] font-semibold mt-6 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Ver lista de líderes &rarr;
              </span>
            </Link>

          </div>
        </div>

      </main>
    </div>
  )
}