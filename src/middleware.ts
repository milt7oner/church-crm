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

  // Si la ruta es pública (assets, api pública), dejamos pasar
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return response
  }

  // 2. Si no está logueado y quiere entrar a rutas protegidas
  if (!user && (pathname.startsWith('/admin') || pathname.startsWith('/lider') || pathname.startsWith('/cambiar-password'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. Si está logueado y va a /login, redirigir según su rol
  if (user && pathname === '/login') {
    const { data: persona } = await supabase
      .from('personas')
      .select('rol_sistema')
      .eq('auth_user_id', user.id)
      .single()

    if (['super_admin', 'pastor', 'encargado'].includes(persona?.rol_sistema)) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/lider/mis-consolidados', request.url))
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
  matcher: ['/admin/:path*', '/lider/:path*', '/cambiar-password', '/login'],
}