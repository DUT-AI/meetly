import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/meetly/sign-in') ||
    pathname.startsWith('/meetly/login');
  const isPublicPage =
    isAuthPage ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/meetly/privacy') ||
    pathname.startsWith('/meetly/api');

  if (!token && !isPublicPage) {
    const signInPath = pathname.startsWith('/meetly') ? '/meetly/sign-in' : '/sign-in';
    const loginUrl = new URL(signInPath, request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isAuthPage) {
    const destinationPath = pathname.startsWith('/meetly') ? '/meetly/tasks' : '/tasks';
    const defaultUrl = new URL(destinationPath, request.url);
    return NextResponse.redirect(defaultUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|apple-icon.png|icon1.png|icon2.png).*)',
  ],
};
