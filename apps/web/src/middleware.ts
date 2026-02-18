import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page without authentication
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // Get session from request cookies
  const sessionCookie = request.cookies.get('sb-auth-token')?.value;

  // If no session and trying to access protected routes, redirect to login
  if (!sessionCookie && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user is on root, redirect to dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // TODO: Add role-based access control when Supabase Auth is fully integrated
  // This will check profile.role and redirect accordingly

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
