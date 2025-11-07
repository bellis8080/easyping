import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { UserRole } from '@easyping/types';
import { canAccessRoute } from '@/lib/auth/permissions';
import { isSetupComplete } from '@/lib/setup';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isSetupRoute = pathname.startsWith('/setup');

  // Check if setup is complete (organization exists)
  const setupComplete = await isSetupComplete();

  // Redirect to setup wizard if not complete and not already on setup page
  if (!setupComplete && !isSetupRoute) {
    return NextResponse.redirect(new URL('/setup', request.url));
  }

  // Redirect away from setup if already complete
  if (setupComplete && isSetupRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Refresh session and set tenant context
  const response = await updateSession(request);

  // Check if user is authenticated
  const userId = response.headers.get('x-user-id');
  const userRole = response.headers.get('x-user-role') as UserRole | null;

  // Define protected route patterns
  const protectedPaths = ['/dashboard', '/tickets', '/kb', '/settings'];
  const authPaths = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
  ];

  // Check if current path is protected
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path));

  // Redirect to login if accessing protected route without auth
  if (isProtectedPath && !userId) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role-based access for authenticated users
  if (userId && userRole && isProtectedPath) {
    if (!canAccessRoute(userRole, pathname)) {
      // User doesn't have permission for this route
      const dashboardUrl = new URL('/dashboard', request.url);
      dashboardUrl.searchParams.set('error', 'insufficient_permissions');
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // Redirect to dashboard if accessing auth pages while authenticated
  if (isAuthPath && userId) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
