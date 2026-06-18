import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Hand-off from a finished analysis into the chat experience, so the user can
 * ask follow-up questions about it ("what should I reply?", "is this flag
 * serious?"). Reuses an existing chat session for this analysis if one exists,
 * otherwise creates one seeded with the analysis card. Returns the session id.
 *
 * Access is gated downstream: the chat page and chat API only reveal analysis
 * contents to users who are premium or have unlocked this specific analysis.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { analysisId } = await request.json().catch(() => ({ analysisId: null }));
    if (!analysisId || typeof analysisId !== 'string') {
      return NextResponse.json({ error: 'Missing analysisId' }, { status: 400 });
    }

    // The analysis must exist and belong to this user.
    const { data: analysis } = await supabase
      .from('analysis_results')
      .select('id, user_id')
      .eq('id', analysisId)
      .maybeSingle();
    if (!analysis || analysis.user_id !== user.id) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Reuse a session that already references this analysis, so repeated
    // hand-offs don't spawn duplicate chats.
    const { data: existing } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('user_id', user.id)
      .contains('analysis_ids', [analysisId])
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ sessionId: existing.id });
    }

    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        title: 'Your analysis',
        analysis_ids: [analysisId],
        has_analysis: true,
      })
      .select('id')
      .single();
    if (sessionError || !session) {
      console.error('Failed to create chat session for analysis:', sessionError?.message);
      return NextResponse.json({ error: 'Could not open chat' }, { status: 500 });
    }

    // Seed the transcript: a short intro plus the analysis card. The card is
    // re-hydrated (and re-gated) from analysisResultId when the page loads.
    const now = new Date().toISOString();
    const messages = [
      {
        id: `intro-${Date.now()}`,
        role: 'assistant',
        type: 'text',
        content:
          "Here's your analysis. Ask me anything about it — what a flag means, what to say back, or what to do next.",
        timestamp: now,
      },
      {
        id: `analysis-${Date.now()}`,
        role: 'assistant',
        type: 'analysis',
        content: '',
        analysisResultId: analysisId,
        timestamp: now,
      },
    ];

    const { error: historyError } = await supabase
      .from('chat_history')
      .insert({ session_id: session.id, user_id: user.id, messages });
    if (historyError) {
      console.warn('Failed to seed chat history:', historyError.message);
      // Non-fatal: the session still opens; the card will repopulate on next save.
    }

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Chat from-analysis error:', error);
    return NextResponse.json({ error: 'Could not open chat' }, { status: 500 });
  }
}
