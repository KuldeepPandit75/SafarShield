import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith('/Login') ||
    request.nextUrl.pathname.startsWith('/Signup');
  const isUserPage = request.nextUrl.pathname === '/user';
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard');

  // Check if it's a protected route
  const isProtectedRoute = isUserPage || isDashboardPage;

  // For protected routes: Only redirect if there's NO token
  // If token exists, let it through and let client-side handle verification with loading states
  if (isProtectedRoute && !token) {
    // No token at all - redirect to login
    return NextResponse.redirect(new URL('/Login', request.url));
  }

  // If token exists, let the request proceed
  // Client-side AuthProvider will handle verification and show loading states
  // This prevents premature redirects during initial load

  // Redirect to role-specific page if accessing auth pages with valid token
  // Only do this if we can quickly verify, otherwise let client handle it
  if (isAuthPage && token) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/verify-token`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: AbortSignal.timeout(3000), // Short timeout for auth pages
      });

      if (response.ok) {
        const data = await response.json();
        const userRole = data.user?.role;

        console.log('User already authenticated with role:', userRole);

        // Redirect based on role
        const role = String(userRole).toLowerCase();
        if (role === 'tourist' || role === 'traveller') {
          return NextResponse.redirect(new URL('/user', request.url));
        } else if (role === 'officer' || role === 'police' || role === 'admin') {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        } else {
          // Default to home for other roles
          return NextResponse.redirect(new URL('/', request.url));
        }
      }
      // If verification fails, continue to auth page - client will handle it
    } catch (error) {
      // Network errors or timeouts - let client handle it
      // Don't redirect, just continue to auth page
    }
  }
  
  const res = NextResponse.next();
  // Disable cache
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = {
  matcher: ['/user', '/dashboard', '/Login', '/Signup']
}; 