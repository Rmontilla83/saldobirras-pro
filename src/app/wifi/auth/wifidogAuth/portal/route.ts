import { NextRequest } from 'next/server';

/**
 * GET /wifi/auth/wifidogAuth/portal/
 *
 * WifiDog "portal" endpoint — the gateway redirects the CLIENT browser here after auth.
 * - If auth succeeded (no message param): redirect to success → portal
 * - If message=denied: redirect to WiFi login with error
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const message = searchParams.get('message');

  console.log('[wifidogAuth/portal] params:', JSON.stringify(Object.fromEntries(searchParams.entries())));

  if (message === 'denied') {
    return Response.redirect(new URL('/wifi?error=denied', req.url), 302);
  }

  // Auth succeeded — go to success page (which auto-redirects to portal)
  return Response.redirect(new URL('/wifi/success', req.url), 302);
}
