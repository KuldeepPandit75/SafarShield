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

  // Redirect to login if accessing protected route without token
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/Login', request.url));
  }

  // Verify token with backend for all protected routes
  if (isProtectedRoute && token) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/verify-token`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.log('Token is invalid');
        // If token is invalid, redirect to login
        return NextResponse.redirect(new URL('/Login', request.url));
      }
    } catch (error) {
      // If verification fails, redirect to login
      console.log(error);
      return NextResponse.redirect(new URL('/Login', request.url));
    }
  }

  // Redirect to home if accessing auth pages with valid token
  if (isAuthPage && token) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/verify-token`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        console.log('User already authenticated, redirecting to home');
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch (error) {
      console.log('Token verification failed for auth page:', error);
      // If verification fails, continue to auth page
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