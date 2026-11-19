import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/sign-in');
  const isPublicPage = isAuthPage || pathname.startsWith('/privacy') || pathname.startsWith('/api');

  if (!token && !isPublicPage) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isAuthPage) {
    const defaultUrl = new URL('/tasks', request.url);
    return NextResponse.redirect(defaultUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|apple-icon.png|icon1.png|icon2.png).*)',
  ],
};
