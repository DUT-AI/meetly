import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const { pathname } = request.nextUrl;

  // Strip unwanted /meetly prefix and redirect to clean URL
  if (pathname === '/meetly' || pathname === '/meetly/') {
    return NextResponse.redirect(new URL('/tasks', request.url), 308);
  }

  if (pathname.startsWith('/meetly/') && !pathname.startsWith('/meetly/api')) {
    const cleanPath = pathname.replace(/^\/meetly/, '') || '/tasks';
    const redirectUrl = new URL(cleanPath, request.url);
    request.nextUrl.searchParams.forEach((value, key) => {
      redirectUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(redirectUrl, 308);
  }

  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/sign-in');
  const isPublicPage =
    isAuthPage ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/meetly/api');

  if (!token && !isPublicPage) {
    const loginUrl = new URL('/sign-in', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/tasks', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|apple-icon.png|icon1.png|icon2.png).*)',
  ],
};
