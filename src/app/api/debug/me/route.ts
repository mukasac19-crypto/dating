import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic: reports exactly what the server (SSR session + RLS) sees for the
 * caller — the same read path the analysis page uses to decide premium vs free.
 * Returns only the caller's own data. Safe to remove once billing is verified.
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();

  // Which Supabase project this deployment talks to (project ref only).
  const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/^https?:\/\//, '')
    .split('.')[0];

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      userError: userErr?.message ?? null,
      projectRef,
    });
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, subscription, subscription_current_period_end, stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  return NextResponse.json({
    authenticated: true,
    authUserId: user.id,
    authEmail: user.email,
    profileReadError: error?.message ?? null,
    profileFound: !!profile,
    profile,
    projectRef,
  });
}
