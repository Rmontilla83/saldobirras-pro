import { createClient as createSupabase } from '@supabase/supabase-js';

// Admin client with service_role — use ONLY in API routes, never in browser
export function createAdminClient() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
