/**
 * GET /wifi/auth/wifidogAuth/ping/
 *
 * WifiDog "ping" endpoint — gateway heartbeat.
 * Must respond with "Pong" to confirm auth server is alive.
 */
export async function GET() {
  return new Response('Pong', { status: 200 });
}
