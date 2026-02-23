import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const { pathname } = req.nextUrl;

  // portal.birrasport.com → serve /portal routes
  if (host.startsWith('portal.')) {
    // If accessing root, redirect to /portal
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/portal', req.url));
    }
    // Block access to admin routes from portal subdomain
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/portal', req.url));
    }
  }

  // app.birrasport.com or birrasport.com → normal app behavior
  // Redirect birrasport.com root to app.birrasport.com
  if (host === 'birrasport.com' || host === 'www.birrasport.com') {
    return NextResponse.redirect(new URL(`https://app.birrasport.com${pathname}`, req.url), 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon-|logo|fondo|sw.js|manifest).*)'],
};
