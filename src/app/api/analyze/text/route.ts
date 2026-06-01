import { NextRequest, NextResponse } from 'next/server';
import { analyzeConversationWithContext } from '@/lib/analyze-enhanced'; 
import { redactPersonalInfo } from '@/lib/ocr';
import { createClient } from '@/lib/supabase/server';
import { ChatMessage } from '@/types';
import { analysisRatelimit } from '@/lib/rate-limit'; // IMPORT SPECIFIC LIMITER
import { persistAnalysis, gateAnalysisResponse } from '@/lib/save-analysis';
import { 
  parseWhatsAppExport, 
  detectWhatsAppFormat, 
  extractSenderNames 
} from '@/lib/parsers/whatsapp-parser';

function parseTextToMessages(text: string): ChatMessage[] {
  // ... (Keep your existing helper function exactly as it was)
  const lines = text.split('\n').filter(line => line.trim());
  const messages: ChatMessage[] = [];
  let currentSender: 'user' | 'match' = 'match';
  lines.forEach((line, index) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0 && colonIndex < 20) {
      const sender = line.substring(0, colonIndex).trim().toLowerCase();
      const content = line.substring(colonIndex + 1).trim();
      currentSender = (sender.includes('me') || sender.includes('i') || sender === 'you') ? 'user' : 'match';
      if (content) {
        messages.push({
          id: `msg-${index}`,
          sender: currentSender,
          content,
          timestamp: new Date(Date.now() - (lines.length - index) * 60000),
        });
      }
    } else if (line.trim()) {
      messages.push({
        id: `msg-${index}`,
        sender: currentSender,
        content: line.trim(),
        timestamp: new Date(Date.now() - (lines.length - index) * 60000),
      });
    }
  });
  return messages;
}

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

    const { text, platform, userIdentifier, sessionId } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid text input' }, { status: 400 });
    }

    // --- INPUT SAFETY CHECK ---
    // Limit input to ~500KB characters to prevent token exhaustion or DOS
    if (text.length > 500000) {
      return NextResponse.json({ error: 'Text too long. Please limit to 500,000 characters.' }, { status: 400 });
    }

    let messages: ChatMessage[];
    let analysisMetadata: any = {};

    const isWhatsApp = platform === 'whatsapp' || detectWhatsAppFormat(text);

    if (isWhatsApp) {
      if (!userIdentifier) {
        const senders = extractSenderNames(text);
        if (senders.length >= 2) {
          return NextResponse.json({ 
            error: 'User identification required',
            requiresUserIdentifier: true,
            detectedSenders: senders,
            message: 'Please identify who you are in this conversation'
          }, { status: 400 });
        } else if (senders.length === 0) {
          return NextResponse.json({ error: 'No valid WhatsApp messages found' }, { status: 400 });
        }
      }
      
      const parseResult = parseWhatsAppExport(text, userIdentifier);
      messages = parseResult.messages;
      analysisMetadata = { ...parseResult.metadata, platform: 'whatsapp' };
    } else {
      const redactedText = redactPersonalInfo(text);
      messages = parseTextToMessages(redactedText);
      analysisMetadata = { platform: 'generic' };
    }

    if (messages.length === 0) {
      return NextResponse.json({ error: 'No valid messages found' }, { status: 400 });
    }

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', user.id)
      .maybeSingle();
    const userName =
      profileRow?.full_name?.trim() ||
      profileRow?.username?.trim() ||
      user.email?.split('@')[0] ||
      null;

    const analysisResult = await analyzeConversationWithContext(messages, {
      ...analysisMetadata,
      userName,
    });

    if (isWhatsApp && analysisMetadata.harassmentIndicators) {
      const { callCount, thirdPartyContact } = analysisMetadata.harassmentIndicators;
      if (callCount >= 50) {
        analysisResult.flags.unshift({
          id: 'whatsapp-stalking',
          type: 'red',
          category: 'suspicious_behavior',
          severity: 'critical',
          message: `Extreme stalking behavior: ${callCount} unanswered call attempts`,
          evidence: `${callCount} call attempts detected`,
          messageId: '',
          confidence: 1.0,
          safetyLevel: 'immediate_danger',
          whatToDo: 'Block immediately and consider legal action.',
          exitStrategy: 'Block on all platforms. Save evidence.'
        });
        analysisResult.riskScore = Math.max(analysisResult.riskScore, 95);
      }
      if (thirdPartyContact) {
        analysisResult.flags.unshift({
          id: 'whatsapp-boundary-violation',
          type: 'red',
          category: 'boundary_violation',
          severity: 'critical',
          message: 'Contacted your family/friends without permission',
          evidence: 'Messages indicate contact with your personal contacts',
          messageId: '',
          confidence: 1.0,
          safetyLevel: 'immediate_danger',
          whatToDo: 'Serious boundary violation. Warn your contacts.',
          exitStrategy: 'Document everything.'
        });
      }
    }

    const resultId = await persistAnalysis(
      supabase,
      user.id,
      analysisResult,
      {
        ...analysisMetadata,
        message_count: messages.length,
        analysis_type: 'text',
        platform: isWhatsApp ? 'whatsapp' : 'generic',
      },
      sessionId
    );

    if (!resultId) {
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
    }

    // Gate the payload: premium users get the full result, everyone else gets
    // only the verdict teaser. The substantive fields never leave the server.
    const gated = await gateAnalysisResponse(supabase, user.id, resultId, analysisResult);
    return NextResponse.json({ ...gated, metadata: analysisMetadata });

  } catch (error) {
    console.error('Text analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze conversation' }, { status: 500 });
  }
}