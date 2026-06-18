import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeConversationWithContext } from '@/lib/analyze-enhanced';
import OpenAI from 'openai';
import { ChatMessage } from '@/types';
import { ocrRatelimit, checkAnonAnalysisLimit, getClientIp } from '@/lib/rate-limit';
import { persistAnalysis, gateAnalysisResponse } from '@/lib/save-analysis';
import { isPremium } from '@/lib/subscription';
import { FREE_MAX_IMAGES, PREMIUM_MAX_IMAGES, maxImagesFor } from '@/lib/limits';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'nodejs';
export const maxDuration = 60;

const OCR_PROMPT = `You are an expert at extracting messaging and dating-app conversations (WhatsApp, iMessage, Tinder, Bumble, Hinge, Instagram, Snapchat, etc.) from screenshots with perfect accuracy.

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
    { "sender": "user" | "match", "content": "exact message text (excluding any quoted-reply preview)", "visual_position": "left" | "right", "bubble_color": "color if identifiable", "timestamp": "if visible" }
  ],
  "platform_detected": "WhatsApp/iMessage/Tinder/etc if identifiable",
  "contact_name": "name shown at the top of the chat, if any",
  "visual_cues": "how you decided left vs right",
  "confidence": "high" | "medium" | "low",
  "extraction_notes": "any ambiguities"
}

Getting the sender right — LEFT = match, RIGHT = user — is the single most important thing. Double-check each message's alignment before you finalize.`;

type RawMessage = {
  sender?: string;
  content?: string;
  visual_position?: string;
  timestamp?: string;
};

/**
 * Run OCR + sender attribution on a single screenshot. Returns the raw extracted
 * messages (in top-to-bottom order) plus the detected platform/confidence.
 */
async function extractFromImage(file: File): Promise<{
  messages: RawMessage[];
  platform?: string;
  confidence?: string;
}> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64Image = buffer.toString('base64');

  const ocrResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant designed to output valid JSON. You extract text from images.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: OCR_PROMPT },
          { type: 'image_url', image_url: { url: `data:${file.type};base64,${base64Image}` } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2000,
    temperature: 0.1,
  });

  const ocrContent = JSON.parse(ocrResponse.choices[0].message.content || '{}');
  let extracted: RawMessage[] = ocrContent.messages || [];

  // Verification pass when confidence is low or sender/position disagree.
  const mismatch = extracted.some(
    (m) =>
      (m.sender === 'user' && m.visual_position === 'left') ||
      (m.sender === 'match' && m.visual_position === 'right')
  );
  if (ocrContent.confidence !== 'high' || mismatch) {
    const verificationPrompt = `These messages were extracted from a chat screenshot, but the sender assignments may be wrong. Correct them using these strict rules:

1. SENDER FROM POSITION: if "visual_position" is "right", "sender" MUST be "user". If "visual_position" is "left", "sender" MUST be "match". Fix any message where these disagree.
2. NO MERGED MESSAGES: if a single "content" clearly contains two different people's lines mashed together, split them into separate messages with the correct sender for each.
3. NO QUOTED PREVIEWS: if a message is actually just the quoted-reply preview of an earlier message, remove it.

Extracted data:
${JSON.stringify(ocrContent, null, 2)}

Return corrected JSON: { "messages": [ { "sender", "content", "visual_position", "timestamp" } ] }, preserving top-to-bottom order.`;

    const verificationResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a JSON correction assistant.' },
        { role: 'user', content: verificationPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    });
    const verified = JSON.parse(verificationResponse.choices[0].message.content || '{}');
    extracted = verified.messages || extracted;
  }

  return {
    messages: extracted.filter((m) => m.content && m.content.trim().length > 0),
    platform: ocrContent.platform_detected,
    confidence: ocrContent.confidence,
  };
}

export async function POST(request: NextRequest) {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Daily caps for anonymous (ad-funnel) users: per-user quota + per-IP backstop.
    if (user.is_anonymous) {
      const allowed = await checkAnonAnalysisLimit(user.id, getClientIp(request));
      if (!allowed) {
        return NextResponse.json(
          { error: "You've used your free analyses. Create an account to keep going.", code: 'ANON_LIMIT' },
          { status: 429 }
        );
      }
    }

    // Per-minute cost guard.
    const { success, limit, remaining, reset } = await ocrRatelimit.limit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: 'You are processing images too quickly. Please wait a moment.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }

    // Collect files: accept multiple ("images") and a single legacy "image".
    const formData = await request.formData();
    const sessionId = (formData.get('sessionId') as string | null) || null;
    const files = [
      ...(formData.getAll('images') as File[]),
      ...((formData.get('image') ? [formData.get('image')] : []) as File[]),
    ].filter((f): f is File => f instanceof File && f.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
    }

    // Profile + plan (determines how many screenshots are allowed).
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('full_name, username, subscription, subscription_current_period_end')
      .eq('id', user.id)
      .maybeSingle();

    const premium = isPremium(profileRow);
    const maxImages = maxImagesFor(premium);

    if (files.length > maxImages) {
      return NextResponse.json(
        {
          error: premium
            ? `You can attach up to ${PREMIUM_MAX_IMAGES} screenshots at a time.`
            : `Free accounts can attach up to ${FREE_MAX_IMAGES} screenshots at a time. Upgrade to Premium to analyze more at once.`,
          code: 'IMAGE_LIMIT',
        },
        { status: 400 }
      );
    }

    // OCR every screenshot in parallel, then merge in upload order.
    console.log(`Starting OCR on ${files.length} screenshot(s)...`);
    const perImage = await Promise.all(files.map((f) => extractFromImage(f)));
    const combined: RawMessage[] = perImage.flatMap((r) => r.messages);
    const platform = perImage.find((r) => r.platform)?.platform;
    const lowestConfidence: 'high' | 'medium' | 'low' = perImage.some((r) => r.confidence === 'low')
      ? 'low'
      : perImage.some((r) => r.confidence === 'medium')
      ? 'medium'
      : 'high';

    if (combined.length < 2) {
      return NextResponse.json(
        {
          error:
            "Couldn't extract enough messages for meaningful analysis. Please ensure the screenshots show a conversation with multiple messages.",
        },
        { status: 400 }
      );
    }

    const formattedMessages: ChatMessage[] = combined.map((msg, index) => {
      // Horizontal alignment is the most reliable sender signal: right = user,
      // left = match. Trust it over the model's own `sender` label when present.
      const position = String(msg.visual_position || '').toLowerCase();
      const senderFromPosition =
        position === 'right' ? 'user' : position === 'left' ? 'match' : null;
      const sender = senderFromPosition ?? (msg.sender === 'user' ? 'user' : 'match');

      return {
        id: `msg-${Date.now()}-${index}`,
        sender,
        content: (msg.content || '').trim(),
        // Synthetic, order-preserving timestamps. OCR'd time strings (e.g.
        // "12:21 PM") aren't reliable Dates; ordering is what the analysis needs.
        timestamp: new Date(Date.now() - (combined.length - index) * 60000),
      };
    });

    const userName =
      profileRow?.full_name?.trim() ||
      profileRow?.username?.trim() ||
      user.email?.split('@')[0] ||
      null;

    const analysisResult = await analyzeConversationWithContext(formattedMessages, {
      platform,
      userName,
    });

    const enrichedResult = {
      ...analysisResult,
      ocrMetadata: {
        platform,
        confidence: lowestConfidence,
        imageCount: files.length,
        messageCount: formattedMessages.length,
      },
    };

    const resultId = await persistAnalysis(
      supabase,
      user.id,
      enrichedResult,
      { analysis_type: 'image', image_count: files.length, ocr_metadata: enrichedResult.ocrMetadata },
      sessionId
    );

    if (!resultId) {
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
    }

    console.log(
      `Analysis complete from ${files.length} image(s). Risk: ${analysisResult.riskScore}%, Trust: ${analysisResult.trustScore}%`
    );

    const gated = await gateAnalysisResponse(supabase, user.id, resultId, enrichedResult);
    return NextResponse.json(gated);
  } catch (error) {
    console.error('Image analysis error:', error);

    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Service is currently busy. Please try again in a moment.' },
          { status: 429 }
        );
      }
      if (error.message.includes("'messages' must contain the word 'json'")) {
        console.error('Critical: OpenAI JSON prompt constraint failed.');
        return NextResponse.json({ error: 'Internal AI Error: JSON constraint.' }, { status: 500 });
      }
    }

    return NextResponse.json(
      { error: 'Failed to analyze the conversation. Please try again.' },
      { status: 500 }
    );
  }
}
