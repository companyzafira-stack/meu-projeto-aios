import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and API routes without authentication
  if (pathname.startsWith('/login') || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check for Supabase auth cookie (format: sb-<project-ref>-auth-token)
  const hasAuthCookie = request.cookies.getAll().some(
    (cookie) => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
  );

  // If no session and trying to access protected routes, redirect to login
  if (!hasAuthCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user is on root, redirect to inicio
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/inicio', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
