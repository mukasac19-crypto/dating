import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { ONE_TIME_UNLOCK } from '@/lib/plan';

export const ONE_TIME_UNLOCK_TYPE = 'one_time_unlock';

/**
 * Whether the user has a one-time unlock for this specific analysis. Premium is
 * checked separately (it unlocks everything); this is only the per-analysis
 * purchase. Returns false on any error so access fails closed.
 */
export async function isAnalysisUnlocked(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('analysis_unlocks')
    .select('id')
    .eq('user_id', userId)
    .eq('analysis_id', analysisId)
    .maybeSingle();
  if (error) {
    console.error('Failed to check analysis unlock:', error.message);
    return false;
  }
  return !!data;
}

/**
 * Which of the given analysis ids this user has a one-time unlock for. Used to
 * gate per-analysis access in places that handle several at once (the chat
 * session page and chat API). Returns an empty set on error (fails closed).
 */
export async function getUnlockedAnalysisIds(
  supabase: SupabaseClient,
  userId: string,
  analysisIds: string[]
): Promise<Set<string>> {
  if (analysisIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from('analysis_unlocks')
    .select('analysis_id')
    .eq('user_id', userId)
    .in('analysis_id', analysisIds);
  if (error) {
    console.error('Failed to load analysis unlocks:', error.message);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.analysis_id as string));
}

/**
 * Idempotently record a one-time unlock. Safe to call from both the webhook and
 * the checkout-return reconcile — the unique (user_id, analysis_id) constraint
 * makes the second call a no-op. Must be called with a service-role client.
 */
export async function recordUnlock(
  supabaseAdmin: SupabaseClient,
  params: {
    userId: string;
    analysisId: string;
    sessionId?: string | null;
    amount?: number | null;
    currency?: string | null;
  }
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('analysis_unlocks')
    .upsert(
      {
        user_id: params.userId,
        analysis_id: params.analysisId,
        stripe_session_id: params.sessionId ?? null,
        amount: params.amount ?? ONE_TIME_UNLOCK.amountCents,
        currency: params.currency ?? ONE_TIME_UNLOCK.currency,
      },
      { onConflict: 'user_id,analysis_id', ignoreDuplicates: true }
    );
  if (error) {
    console.error('Failed to record analysis unlock:', error.message);
    throw error;
  }
}

/**
 * Reconcile a one-time unlock directly from a completed Checkout Session, so the
 * unlock is granted on the checkout-return render without waiting for the
 * webhook. Verifies the session is paid and is a one-time-unlock before
 * recording. Returns the unlocked analysis id, or null if nothing was granted.
 */
export async function reconcileUnlockFromSession(
  stripe: Stripe,
  supabaseAdmin: SupabaseClient,
  sessionId: string
): Promise<string | null> {
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    console.error('Could not retrieve checkout session for unlock:', err);
    return null;
  }

  if (
    session.mode !== 'payment' ||
    session.payment_status !== 'paid' ||
    session.metadata?.type !== ONE_TIME_UNLOCK_TYPE
  ) {
    return null;
  }

  const userId = session.metadata?.userId;
  const analysisId = session.metadata?.analysisId;
  if (!userId || !analysisId) return null;

  await recordUnlock(supabaseAdmin, {
    userId,
    analysisId,
    sessionId: session.id,
    amount: session.amount_total,
    currency: session.currency,
  });
  return analysisId;
}
