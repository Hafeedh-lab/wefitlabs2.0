/**
 * Next.js Middleware
 * Protects routes that require authentication
 */

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Database } from '@/types/database';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient<Database>({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes
  const isAdminRoute = req.nextUrl.pathname.includes('/admin');
  const isScorerRoute = req.nextUrl.pathname.includes('/scorer');
  const isProtectedRoute = isAdminRoute || isScorerRoute;

  // If accessing a protected route without auth, redirect to home with error
  if (isProtectedRoute && !session) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/';
    redirectUrl.searchParams.set('error', 'auth_required');
    return NextResponse.redirect(redirectUrl);
  }

  // Check role-based access for admin routes
  if (isAdminRoute && session) {
    const userRole = session.user.user_metadata?.role;
    if (userRole !== 'admin') {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/';
      redirectUrl.searchParams.set('error', 'insufficient_permissions');
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Check role-based access for scorer routes
  if (isScorerRoute && session) {
    const userRole = session.user.user_metadata?.role;
    if (userRole !== 'admin' && userRole !== 'scorer') {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/';
      redirectUrl.searchParams.set('error', 'insufficient_permissions');
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - sw.js (service worker)
     * - workbox-*.js (workbox files)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-.*\\.js).*)',
  ],
};
