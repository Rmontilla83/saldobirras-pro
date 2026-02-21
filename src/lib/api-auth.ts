import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export async function getAuthUser(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') || '',
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Get user profile with business_id
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}

export function unauthorized() {
  return Response.json({ success: false, error: 'No autorizado' }, { status: 401 });
}

export function badRequest(msg: string) {
  return Response.json({ success: false, error: msg }, { status: 400 });
}

export function ok(data: unknown) {
  return Response.json({ success: true, data });
}
