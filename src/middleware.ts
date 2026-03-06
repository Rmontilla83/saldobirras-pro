import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
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

  // Refresh Supabase session to keep mobile users logged in
  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as any)
          );
        },
      },
    }
  );

  // This refreshes the session if expired, writing updated cookies to the response
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon-|logo|fondo|sw.js|manifest|offline.html).*)'],
};
