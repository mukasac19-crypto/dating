import { NextRequest, NextResponse } from 'next/server';
import { analyzeConversationWithContext } from '@/lib/analyze-enhanced';
import { createClient } from '@/lib/supabase/server';
import { ChatMessage } from '@/types';
import { analysisRatelimit } from '@/lib/rate-limit'; // IMPORT SPECIFIC LIMITER
import { persistAnalysis, gateAnalysisResponse } from '@/lib/save-analysis';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- RATE LIMIT CHECK ---
    const { success } = await analysisRatelimit.limit(user.id);
    if (!success) {
       return NextResponse.json({ error: 'Analysis limit reached. Please wait a minute.' }, { status: 429 });
    }
    // ------------------------

    const { messages, sessionId } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    const formattedMessages: ChatMessage[] = messages.map((msg: any, index: number) => ({
      id: msg.id || `msg-${Date.now()}-${index}`,
      content: msg.content,
      sender: msg.sender,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
    }));

    const analysisResult = await analyzeConversationWithContext(formattedMessages);

    const resultId = await persistAnalysis(
      supabase,
      user.id,
      analysisResult,
      { message_count: formattedMessages.length, analysis_type: 'image_ocr' },
      sessionId
    );

    if (!resultId) {
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
    }

    const gated = await gateAnalysisResponse(supabase, user.id, resultId, analysisResult);
    return NextResponse.json(gated);
  } catch (error) {
    console.error('Image analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze conversation' }, { status: 500 });
  }
}