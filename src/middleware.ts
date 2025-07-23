import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const isAuthRoute = 
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register')
  const isProtectedRoute = 
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/projects') ||
    request.nextUrl.pathname.startsWith('/tasks') ||
    request.nextUrl.pathname.startsWith('/team') ||
    request.nextUrl.pathname.startsWith('/clients') ||
    request.nextUrl.pathname.startsWith('/invoicing') ||
    request.nextUrl.pathname.startsWith('/time-tracking') ||
    request.nextUrl.pathname.startsWith('/calendar') ||
    request.nextUrl.pathname.startsWith('/documents') ||
    request.nextUrl.pathname.startsWith('/leaves') ||
    request.nextUrl.pathname.startsWith('/notifications') ||
    request.nextUrl.pathname.startsWith('/settings') ||
    request.nextUrl.pathname.startsWith('/audit-log')

  // Si l'utilisateur est connecté et essaie d'accéder à la page de connexion
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Si l'utilisateur n'est pas connecté et essaie d'accéder à une route protégée
  if (!session && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Rediriger la page d'accueil vers le dashboard si connecté, sinon vers login
  if (request.nextUrl.pathname === '/') {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
} 