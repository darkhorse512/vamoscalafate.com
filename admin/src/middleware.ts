import { NextResponse, type NextRequest } from 'next/server'

const SESSION_COOKIE = 'vc_admin_session'

/**
 * Edge gate for the admin application.
 *
 * This is a FIRST line of defence, not the only one. It runs on the Edge
 * runtime with no database access, so it can only check that a session cookie
 * is *present* - it cannot verify the session is valid or that the user holds
 * the right role.
 *
 * Real authentication and authorization happen in every page and every server
 * action via requireSession() / requirePermission(), which do hit the
 * database. Deleting this middleware would not open a hole; it exists to
 * redirect unauthenticated visitors cheaply, before a page render starts.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value)

  // Already signed in and visiting /login: send to the dashboard.
  if (pathname === '/login') {
    if (hasSessionCookie) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  if (!hasSessionCookie) {
    const loginUrl = new URL('/login', request.url)
    // Preserve the intended destination so login can return the user there.
    // Only a path is carried, never an absolute URL, which would make this an
    // open-redirect vector.
    if (pathname !== '/' && pathname !== '/dashboard') {
      loginUrl.searchParams.set('next', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /**
     * Everything except Next internals, the auth endpoints and static files.
     */
    // Brand assets and icons are public: the login page shows the logo to
    // visitors who are, by definition, not signed in yet.
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|robots.txt|api/health).*)',
  ],
}
