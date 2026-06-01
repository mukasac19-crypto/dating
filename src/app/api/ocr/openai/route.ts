import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeConversationWithContext } from '@/lib/analyze-enhanced';
import OpenAI from 'openai';
import { ChatMessage } from '@/types';
import { ocrRatelimit } from '@/lib/rate-limit'; // Keep our rate limiter!
import { persistAnalysis, gateAnalysisResponse } from '@/lib/save-analysis';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- RATE LIMIT CHECK (Preserved) ---
    const { success, limit, remaining, reset } = await ocrRatelimit.limit(user.id);
    if (!success) {
      return NextResponse.json({ 
        error: 'You are processing images too quickly. Please wait a moment.' 
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString()
        }
      });
    }
    // ------------------------------------

    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const sessionId = (formData.get('sessionId') as string | null) || null;
    if (!file) {
      return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Image = buffer.toString('base64');
    
    const ocrPrompt = `You are an expert at extracting messaging and dating-app conversations (WhatsApp, iMessage, Tinder, Bumble, Hinge, Instagram, Snapchat, etc.) from screenshots with perfect accuracy.

#1 RULE — WHO SENT EACH MESSAGE (most important part of this task):
Every chat app uses the same layout, so decide the sender by HORIZONTAL ALIGNMENT first:
- A bubble aligned to the RIGHT of the screen was sent by the USER (the person who took the screenshot). These are the colored bubbles (green on WhatsApp, blue on iMessage) and may show double check-marks (✓✓) or "Read"/"Delivered".
- A bubble aligned to the LEFT was sent by the OTHER PERSON (the MATCH). These are the white/gray bubbles. The other person's name is usually the chat title at the very top.
Right → "user". Left → "match". Use bubble color and name labels ONLY to confirm — never to override a clear left/right position.

HANDLING REPLIES / QUOTED MESSAGES (critical — this is where mistakes happen):
A reply shows a small boxed preview of an EARLIER message at the TOP of a bubble — a colored vertical bar with a name label ("You" or the contact's name) and a snippet of older text. This preview is a QUOTE of a previous message, NOT a new message.
- Do NOT output the quoted preview as its own message.
- Do NOT merge the quoted preview text into the reply's content.
- The real message is ONLY the text BELOW the quoted preview, and its sender is decided purely by which side the WHOLE bubble sits on (right = user, left = match).
- The "You"/name label inside the quote tells you who originally said the quoted line — it does NOT change who sent the current reply.

OTHER RULES:
1. Extract every real message top-to-bottom, in order. One bubble = one message (after ignoring quoted-reply previews).
2. Keep exact wording. NEVER paraphrase, and NEVER combine two separate messages into one.
3. Capture timestamps if visible.
4. Ignore UI chrome (headers, date separators like "Today", typing indicators, call icons) — they are not messages.

Return a JSON object:
{
  "messages": [
    {
      "sender": "user" | "match",
      "content": "exact message text (excluding any quoted-reply preview)",
      "visual_position": "left" | "right",
      "bubble_color": "color if identifiable",
      "timestamp": "if visible"
    }
  ],
  "platform_detected": "WhatsApp/iMessage/Tinder/etc if identifiable",
  "contact_name": "name shown at the top of the chat, if any",
  "visual_cues": "how you decided left vs right",
  "confidence": "high" | "medium" | "low",
  "extraction_notes": "any ambiguities"
}

Getting the sender right — LEFT = match, RIGHT = user — is the single most important thing. Double-check each message's alignment before you finalize.`;

    console.log("Starting OCR extraction...");
    
    const ocrResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        // --- FIX IS HERE: Explicit System Message containing "JSON" ---
        {
           role: 'system', 
           content: 'You are a helpful assistant designed to output valid JSON. You extract text from images.' 
        },
        // ---------------------------------------------------------------
        { 
          role: 'user', 
          content: [
            { type: 'text', text: ocrPrompt },
            { 
              type: 'image_url', 
              image_url: { 
                url: `data:${file.type};base64,${base64Image}` 
              } 
            }
          ] 
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
      temperature: 0.1, 
    });
    
    console.log("Raw OCR Response:", ocrResponse.choices[0].message.content);
    
    const ocrContent = JSON.parse(ocrResponse.choices[0].message.content || '{}');
    
    let extractedMessages: any[] = ocrContent.messages || [];
    
    // Verification pass
    if (ocrContent.confidence !== 'high' || extractedMessages.some((msg: any) => 
      (msg.sender === 'user' && msg.visual_position === 'left') ||
      (msg.sender === 'match' && msg.visual_position === 'right')
    )) {
      console.log("Confidence not high or position mismatch detected. Running verification...");
      
      const verificationPrompt = `These messages were extracted from a chat screenshot, but the sender assignments may be wrong. Correct them using these strict rules:

1. SENDER FROM POSITION: if "visual_position" is "right", "sender" MUST be "user". If "visual_position" is "left", "sender" MUST be "match". Fix any message where these disagree.
2. NO MERGED MESSAGES: if a single "content" clearly contains two different people's lines mashed together (e.g. a question from one person followed by an answer from another), split them into separate messages with the correct sender for each.
3. NO QUOTED PREVIEWS: if a message is actually just the quoted-reply preview of an earlier message (a snippet repeated from elsewhere with a name label), remove it.

Extracted data:
${JSON.stringify(ocrContent, null, 2)}

Return corrected JSON: { "messages": [ { "sender", "content", "visual_position", "timestamp" } ] }, preserving top-to-bottom order.`;

      const verificationResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            // Add system message here too just to be safe
            { role: 'system', content: 'You are a JSON correction assistant.' },
            { role: 'user', content: verificationPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      });
      
      const verified = JSON.parse(verificationResponse.choices[0].message.content || '{}');
      extractedMessages = verified.messages || extractedMessages;
    }
    
    extractedMessages = extractedMessages.filter((msg: any) => 
      msg.content && msg.content.trim().length > 0
    );

    if (extractedMessages.length < 2) {
      return NextResponse.json({ 
        error: "Couldn't extract enough messages for meaningful analysis. Please ensure the screenshot shows a conversation with multiple messages." 
      }, { status: 400 });
    }
    
    const formattedMessages: ChatMessage[] = extractedMessages.map((msg: any, index: number) => {
      // Horizontal alignment is the most reliable sender signal: right = user,
      // left = match. Trust it over the model's own `sender` label when present.
      const position = String(msg.visual_position || '').toLowerCase();
      const senderFromPosition =
        position === 'right' ? 'user' : position === 'left' ? 'match' : null;
      const sender = senderFromPosition ?? (msg.sender === 'user' ? 'user' : 'match');

      return {
        id: `msg-${Date.now()}-${index}`,
        sender,
        content: msg.content.trim(),
        timestamp: msg.timestamp || new Date(Date.now() - (extractedMessages.length - index) * 60000),
      };
    });

    console.log(`Extracted ${formattedMessages.length} messages. Starting analysis...`);

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

    const analysisResult = await analyzeConversationWithContext(formattedMessages, {
      platform: ocrContent.platform_detected,
      userName,
    });

    const enrichedResult = {
      ...analysisResult,
      ocrMetadata: {
        platform: ocrContent.platform_detected,
        confidence: ocrContent.confidence,
        extractionNotes: ocrContent.extraction_notes,
        visualCues: ocrContent.visual_cues,
        messageCount: formattedMessages.length,
      }
    };

    const resultId = await persistAnalysis(
      supabase,
      user.id,
      enrichedResult,
      { analysis_type: 'image', ocr_metadata: enrichedResult.ocrMetadata },
      sessionId
    );

    if (!resultId) {
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
    }

    console.log(`Analysis complete. Risk: ${analysisResult.riskScore}%, Trust: ${analysisResult.trustScore}%`);

    // Gate the payload by plan (full result for premium, teaser otherwise).
    const gated = await gateAnalysisResponse(supabase, user.id, resultId, enrichedResult);
    return NextResponse.json(gated);

  } catch (error) {
    console.error('Image analysis error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json({ 
          error: 'Service is currently busy. Please try again in a moment.' 
        }, { status: 429 });
      }
      // Handle the specific JSON error if it still somehow happens
      if (error.message.includes("'messages' must contain the word 'json'")) {
        console.error("Critical: OpenAI JSON prompt constraint failed.");
        return NextResponse.json({ error: 'Internal AI Error: JSON constraint.' }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to analyze the conversation. Please try again.' 
    }, { status: 500 });
  }
}