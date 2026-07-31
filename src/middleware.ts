import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 1. Obtener sesión del usuario
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Si la ruta es pública (assets, archivos estáticos), dejamos pasar
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return response
  }

  // 2. Si NO está logueado y quiere acceder a cualquier ruta protegida
  const rutasProtegidas = ['/admin', '/lider', '/dashboard', '/cambiar-password']
  const requiereAuth = rutasProtegidas.some((ruta) => pathname.startsWith(ruta))

  if (!user && requiereAuth) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. Si SÍ está logueado y entra a /login o a la raíz (/), lo enviamos a /dashboard
  if (user && (pathname === '/login' || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 4. Protección específica para /admin/* (Solo Administradores, Pastores y Encargados)
  if (user && pathname.startsWith('/admin')) {
    const { data: persona } = await supabase
      .from('personas')
      .select('rol_sistema')
      .eq('auth_user_id', user.id)
      .single()

    const rolesAutorizados = ['super_admin', 'pastor', 'encargado']
    if (!persona || !rolesAutorizados.includes(persona.rol_sistema)) {
      // Redirigir al área de líder si no posee rol administrativo
      return NextResponse.redirect(new URL('/lider/mis-consolidados', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/',
    '/dashboard',
    '/admin/:path*',
    '/lider/:path*',
    '/cambiar-password',
    '/login'
  ],
}