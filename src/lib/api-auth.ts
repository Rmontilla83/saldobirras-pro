import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, maxRequests: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  entry.count++;
  if (entry.count > maxRequests) return false;
  return true;
}

export function rateLimited() {
  return Response.json({ success: false, error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' }, { status: 429 });
}

// Input sanitization
export function sanitize(input: string | null | undefined): string {
  if (!input) return '';
  return input.trim().replace(/<[^>]*>/g, '').substring(0, 500);
}

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

  // Check if user is active
  if (profile && profile.is_active === false) return null;

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
