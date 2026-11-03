import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes reachable without a session. Role-based authorization happens in each
// page and server action (requirePerfil / permisos), backed by RLS.
const RUTAS_PUBLICAS = ['/login']

export async function proxy(request: NextRequest) {
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

  // Refreshes the session cookie when needed
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const esPublica = RUTAS_PUBLICAS.includes(pathname)

  if (!user && !esPublica) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && (pathname === '/login' || pathname === '/')) {
    return NextResponse.redirect(new URL('/inicio', request.url))
  }

  return response
}

export const config = {
  // Everything except Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|images/|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
}
