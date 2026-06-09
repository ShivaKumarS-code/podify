import { NextResponse, NextRequest } from 'next/server';

export default function middleware(request: NextRequest) {
  // Check if the auth_token cookie exists
  const hasSessionCookie = request.cookies.has('auth_token');

  const { pathname } = request.nextUrl;

  // 1. Protect dashboard paths: redirect to sign-in if no session cookie exists
  if (pathname.startsWith('/dashboard')) {
    if (!hasSessionCookie) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }
  }

  // 2. Redirect logged-in users away from sign-in/sign-up pages
  if (pathname.startsWith('/auth/sign-in') || pathname.startsWith('/auth/sign-up')) {
    if (hasSessionCookie) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/:path*',
  ],
};
