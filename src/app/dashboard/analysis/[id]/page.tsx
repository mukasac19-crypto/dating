import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import AnalysisView from '@/components/analysis-v2/AnalysisView';
import LockedAnalysisView from '@/components/analysis-v2/LockedAnalysisView';
import UnlockPurchaseTracker from '@/components/analysis-v2/UnlockPurchaseTracker';
import { isPremium } from '@/lib/subscription';
import { isAnalysisUnlocked, reconcileUnlockFromSession } from '@/lib/unlock';
import { getStripe } from '@/lib/stripe';
import { buildAnalysisPreview } from '@/lib/analysis-preview';
import type { AnalysisResult } from '@/types';

// Always render per-request: the premium/locked decision depends on the live
// subscription, which must never be served from a cached render.
export const dynamic = 'force-dynamic';

export default async function AnalysisPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { session_id?: string };
}) {
  const supabase = createClient();
  const { id } = params;

  const [{ data: analysis, error }, { data: { user } }] = await Promise.all([
    supabase.from('analysis_results').select('*').eq('id', id).single(),
    supabase.auth.getUser(),
  ]);

  if (error || !analysis) {
    notFound();
  }

  let firstName: string | null = null;
  let premium = false;
  let unlocked = false;
  if (user) {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('full_name, username, subscription, subscription_current_period_end')
      .eq('id', user.id)
      .maybeSingle();
    const rawName =
      profileRow?.full_name?.trim() ||
      profileRow?.username?.trim() ||
      user.email?.split('@')[0] ||
      null;
    if (rawName) {
      firstName = rawName.split(/\s+/)[0] || null;
    }
    premium = isPremium(profileRow);

    // Returning from a one-time checkout: grant the unlock now rather than
    // waiting on the webhook, so the full result renders on this first load.
    if (!premium && searchParams.session_id) {
      try {
        await reconcileUnlockFromSession(getStripe(), createAdminClient(), searchParams.session_id);
      } catch (err) {
        console.error('Unlock reconcile failed:', err);
      }
    }

    if (!premium) {
      unlocked = await isAnalysisUnlocked(supabase, user.id, id);
    }
  }

  const hasAccess = premium || unlocked;

  const formatted: AnalysisResult = {
    id: analysis.id,
    createdAt: analysis.created_at,
    riskScore: analysis.risk_score,
    trustScore: analysis.trust_score,
    escalationIndex: analysis.escalation_index,
    chatContent: analysis.chat_content,
    flags: analysis.flags,
    timeline: analysis.timeline,
    reciprocityScore: analysis.reciprocity_score,
    consistencyAnalysis: analysis.consistency_analysis,
    suggestedReplies: analysis.suggested_replies,
    evidence: analysis.evidence,
    ocrMetadata: analysis.metadata,
  };

  // Paywall: only users with access (premium OR a one-time unlock for this
  // analysis) receive the full result. Everyone else gets a verdict teaser
  // computed on the server — the substantive fields never reach the browser.
  if (!hasAccess) {
    return (
      <LockedAnalysisView preview={buildAnalysisPreview(formatted)} firstName={firstName} />
    );
  }

  return (
    <>
      {/* Fires the one-time purchase event once when returning from checkout. */}
      {searchParams.session_id && <UnlockPurchaseTracker />}
      <AnalysisView analysis={formatted} firstName={firstName} />
    </>
  );
}
