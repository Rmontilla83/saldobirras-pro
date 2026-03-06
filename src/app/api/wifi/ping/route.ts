// Health check endpoint for Ruijie gateway
// The gateway pings this periodically to verify the auth server is alive

export async function GET() {
  return new Response('Pong', { status: 200 });
}
