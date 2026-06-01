import type { SupabaseClient } from '@supabase/supabase-js';
import type { AnalysisResult } from '@/types';
import type { Json } from '@/types/supabase';
import { isPremium } from '@/lib/subscription';
import { buildAnalysisPreview, type AnalysisPreview } from '@/lib/analysis-preview';

type ServerSupabase = SupabaseClient;

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value ?? null));
}

/**
 * Persist an analysis result server-side (authoritatively) and link it to the
 * chat session. Returns the new row id, or null on failure. This is the single
 * place analyses are written — the browser no longer inserts them, so the full
 * result never has to be handed to the client.
 */
export async function persistAnalysis(
  supabase: ServerSupabase,
  userId: string,
  result: AnalysisResult,
  metadata: Record<string, unknown>,
  sessionId?: string | null
): Promise<string | null> {
  const { data, error } = await supabase
    .from('analysis_results')
    .insert({
      user_id: userId,
      risk_score: result.riskScore,
      trust_score: result.trustScore,
      escalation_index: result.escalationIndex,
      chat_content: toJson(result.chatContent),
      flags: toJson(result.flags),
      timeline: toJson(result.timeline),
      reciprocity_score: toJson(result.reciprocityScore),
      consistency_analysis: toJson(result.consistencyAnalysis),
      suggested_replies: toJson(result.suggestedReplies),
      evidence: toJson(result.evidence),
      metadata: metadata as Json,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('Failed to persist analysis:', error?.message);
    return null;
  }

  const analysisId = data.id;

  if (sessionId) {
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('analysis_ids')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (session) {
      const ids = [...(session.analysis_ids || []), analysisId];
      const { error: linkError } = await supabase
        .from('chat_sessions')
        .update({ analysis_ids: ids, has_analysis: true })
        .eq('id', sessionId)
        .eq('user_id', userId);
      if (linkError) {
        console.warn('Failed to link analysis to session:', linkError.message);
      }
    }
  }

  // Best-effort usage counter.
  await supabase.rpc('increment_analysis_count', { user_uuid: userId });

  return analysisId;
}

export type GatedAnalysisResponse =
  | { resultId: string; locked: false; result: AnalysisResult }
  | { resultId: string; locked: true; preview: AnalysisPreview };

/**
 * Build the response payload for an analysis, gated by the user's plan.
 * Premium users get the full result; everyone else gets only the verdict
 * teaser — the substantive fields never leave the server.
 */
export async function gateAnalysisResponse(
  supabase: ServerSupabase,
  userId: string,
  resultId: string,
  result: AnalysisResult
): Promise<GatedAnalysisResponse> {
  const resultWithId = { ...result, id: resultId };

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription, subscription_current_period_end')
    .eq('id', userId)
    .maybeSingle();

  if (isPremium(profile)) {
    return { resultId, locked: false, result: resultWithId };
  }
  return { resultId, locked: true, preview: buildAnalysisPreview(resultWithId) };
}
