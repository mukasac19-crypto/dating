import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client. Bypasses Row Level Security and has no user
 * session — use it ONLY in server-side routes, after you have independently
 * authenticated the user (e.g. via the SSR server client's getUser()).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
