import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth')

    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL('/', req.url))
      }
      return null
    }

    if (!isAuth) {
      let from = req.nextUrl.pathname
      if (req.nextUrl.search) {
        from += req.nextUrl.search
      }

      return NextResponse.redirect(
        new URL(`/auth/signin?from=${encodeURIComponent(from)}`, req.url)
      )
    }

    // Check role-based access for API routes
    if (req.nextUrl.pathname.startsWith('/api')) {
      const userRole = token?.role
      
      // Admin-only API routes
      if (req.nextUrl.pathname.startsWith('/api/users') && userRole !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // Finance and above can view financial data
      if (req.nextUrl.pathname.includes('price') && userRole === 'STAFF') {
        // Remove renewal price from response for staff users
        // This will be handled in the API route
      }
    }

    return null
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        return true // Let the middleware function handle the authorization logic
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|api/auth/register|_next/static|_next/image|favicon.ico).*)',
  ],
}
