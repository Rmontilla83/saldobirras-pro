import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser, ok, unauthorized, badRequest } from '@/lib/api-auth';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/sessions — Register a new session (called after login)
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { session_id } = await req.json();
  if (!session_id) return badRequest('session_id requerido');

  // Owner can login from multiple devices — skip overwrite
  if (user.role !== 'owner') {
    await admin
      .from('users')
      .update({ active_session_id: session_id })
      .eq('id', user.id);
  }

  return ok({ registered: true });
}

// GET /api/sessions?session_id=xxx — Validate current session is still active
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  // Owner is always valid
  if (user.role === 'owner') return ok({ valid: true });

  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) return badRequest('session_id requerido');

  const { data: profile } = await admin
    .from('users')
    .select('active_session_id')
    .eq('id', user.id)
    .single();

  const valid = profile?.active_session_id === sessionId;
  return ok({ valid });
}
