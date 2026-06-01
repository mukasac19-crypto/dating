import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import AnalysisView from '@/components/analysis-v2/AnalysisView';
import LockedAnalysisView from '@/components/analysis-v2/LockedAnalysisView';
import { isPremium } from '@/lib/subscription';
import { buildAnalysisPreview } from '@/lib/analysis-preview';
import type { AnalysisResult } from '@/types';

// Always render per-request: the premium/locked decision depends on the live
// subscription, which must never be served from a cached render.
export const dynamic = 'force-dynamic';

export default async function AnalysisPage({
  params,
}: {
  params: { id: string };
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
  }

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

  // Paywall: only premium users receive the full result. Everyone else gets a
  // verdict teaser computed on the server — the substantive fields never reach
  // the browser.
  if (!premium) {
    return (
      <LockedAnalysisView preview={buildAnalysisPreview(formatted)} firstName={firstName} />
    );
  }

  return <AnalysisView analysis={formatted} firstName={firstName} />;
}
