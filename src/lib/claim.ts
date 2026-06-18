import type { SupabaseClient } from '@supabase/supabase-js';

// Every table that hangs off a user. When a throwaway anonymous account is
// claimed by a real one, all of its content moves over.
const REPARENT_TABLES = [
  'analysis_results',
  'chat_sessions',
  'chat_history',
  'analysis_unlocks',
  'saved_analyses',
  'feedback',
  'usage_tracking',
] as const;

/**
 * Transfer an analysis — and the rest of its anonymous owner's content — to a
 * newly authenticated account.
 *
 * The scan funnel runs analyses under an anonymous user. If that visitor then
 * authenticates with a *different* identity (Google, or an existing account),
 * the analysis would otherwise be stranded on the throwaway anonymous user and
 * they'd "see nothing". This reparents it.
 *
 * Safety: only ever claims FROM an anonymous account, so it cannot be used to
 * steal a real user's data. Analysis ids are unguessable UUIDs. Must be called
 * with a service-role client.
 *
 * Returns true if a transfer happened.
 */
export async function claimAnalysisForUser(
  admin: SupabaseClient,
  analysisId: string,
  newUserId: string
): Promise<boolean> {
  const { data: analysis } = await admin
    .from('analysis_results')
    .select('user_id')
    .eq('id', analysisId)
    .maybeSingle();
  if (!analysis) return false;

  const ownerId = analysis.user_id as string | null;
  if (!ownerId || ownerId === newUserId) return false;

  // Guard: only reparent from a throwaway anonymous account.
  const { data: ownerRes, error: ownerErr } = await admin.auth.admin.getUserById(ownerId);
  if (ownerErr || !ownerRes?.user?.is_anonymous) return false;

  for (const table of REPARENT_TABLES) {
    const { error } = await admin.from(table).update({ user_id: newUserId }).eq('user_id', ownerId);
    if (error) {
      // Non-fatal: keep reparenting the rest. The analysis row is what matters
      // most for the user actually seeing their result.
      console.error(`Claim: failed to reparent ${table}:`, error.message);
    }
  }
  return true;
}
