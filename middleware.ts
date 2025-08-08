import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Add paths that require authentication
const protectedRoutes = ['/dashboard', '/admin', '/servers'];
const authRoutes = ['/auth/signin', '/auth/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if user has session cookie
  const sessionCookie = request.cookies.get('auth_session');
  const isAuthenticated = !!sessionCookie?.value;

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && authRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect unauthenticated users to signin page
  if (!isAuthenticated && protectedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};