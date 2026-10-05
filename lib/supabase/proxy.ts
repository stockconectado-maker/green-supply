import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
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
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          response = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  /*
   * Verifica realmente el token de Supabase.
   * No usamos getSession() para decidir acceso.
   */
  const { data, error } = await supabase.auth.getClaims()

  const usuarioAutenticado =
    !error &&
    data?.claims &&
    typeof data.claims.sub === 'string'

  const pathname = request.nextUrl.pathname

  /*
   * Estas rutas tienen que funcionar sin sesión previa.
   * Login y recuperación necesitan ser públicas.
   */
  const rutaPublica =
    pathname === '/login' ||
    pathname.startsWith('/auth/') ||
    pathname === '/establecer-clave' ||
    pathname.startsWith('/establecer-clave/')

  /*
   * Si alguien entra directamente al dashboard o a
   * cualquier módulo sin estar autenticado:
   * -> lo mandamos a /login
   */
  if (!usuarioAutenticado && !rutaPublica) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''

    return NextResponse.redirect(url)
  }

  /*
   * Si ya inició sesión y vuelve manualmente a /login,
   * lo mandamos al Inicio.
   */
  if (usuarioAutenticado && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''

    return NextResponse.redirect(url)
  }

  return response
}