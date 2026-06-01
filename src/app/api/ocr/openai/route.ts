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
    
    // Original Prompt
    const ocrPrompt = `You are an expert at extracting dating app conversations from screenshots with perfect accuracy.

CRITICAL INSTRUCTIONS:
1. Extract EVERY message visible in the screenshot, maintaining exact order
2. Identify the sender of each message based on visual position and chat bubble style:
   - Messages on the RIGHT side are typically from the USER (the person taking the screenshot)
   - Messages on the LEFT side are typically from the MATCH (the other person)
   - Look for visual cues like different colored chat bubbles, profile pictures, or names
3. Pay attention to timestamps if visible
4. Include ALL text, even partial messages at screen edges
5. Look for any system messages or notifications in the conversation

VISUAL ANALYSIS TIPS:
- Blue/colored bubbles on right = usually USER messages
- Gray/white bubbles on left = usually MATCH messages
- Check for "Read" or "Delivered" indicators to confirm message direction
- Profile pictures or initials can help identify senders
- Some apps show the match's name at the top

Return a JSON object with a "messages" array where each message has:
{
  "sender": "user" or "match",
  "content": "exact message text",
  "visual_position": "left" or "right" (where it appears on screen),
  "bubble_color": "color of the message bubble if identifiable",
  "timestamp": "if visible in the screenshot"
}

Also include:
- "platform_detected": "Tinder/Bumble/Hinge/etc if identifiable"
- "visual_cues": "description of how you identified senders"
- "confidence": "high/medium/low"
- "extraction_notes": "any ambiguities or issues"

Extract EVERYTHING - even profile names, ages, or bio snippets if visible. We need the complete context.`;

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
      
      const verificationPrompt = `The following messages were extracted from a dating app screenshot...
      
Extracted data:
${JSON.stringify(ocrContent, null, 2)}

Return a corrected JSON with just the "messages" array with accurate sender assignments.`;

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
    
    const formattedMessages: ChatMessage[] = extractedMessages.map((msg: any, index: number) => ({
      id: `msg-${Date.now()}-${index}`,
      sender: msg.sender === 'user' ? 'user' : 'match',
      content: msg.content.trim(),
      timestamp: msg.timestamp || new Date(Date.now() - (extractedMessages.length - index) * 60000),
    }));

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