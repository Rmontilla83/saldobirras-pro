import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const { pathname } = req.nextUrl;

  // portal.birrasport.com → serve /portal routes
  if (host.startsWith('portal.')) {
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/portal', req.url));
    }
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/portal', req.url));
    }
  }

  // Let Vercel handle birrasport.com → www redirect via dashboard config
  // No middleware redirect needed for app.birrasport.com — it's the default

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon-|logo|fondo|sw.js|manifest).*)'],
};
