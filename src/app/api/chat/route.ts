import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { DatingSafetyPromptBuilder } from '@/lib/prompt-builder';
import { chatRatelimit } from '@/lib/rate-limit';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const MAX_RECENT_TEXT_MESSAGES = 30;
const MAX_CHAT_LINES_PER_ANALYSIS = 40;

type IncomingMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export async function POST(request: NextRequest) {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success } = await chatRatelimit.limit(user.id);
    if (!success) {
      return NextResponse.json(
        {
          content:
            "You're typing a bit too fast! Please wait a moment before sending another message.",
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const newMessages: IncomingMessage[] = Array.isArray(body?.messages)
      ? body.messages
      : [];
    const sessionId: string | undefined = body?.sessionId;

    if (!openai) {
      return NextResponse.json({
        content:
          "I'm currently in demo mode. In production, I'll help you analyze dating chats.",
      });
    }

    // Fetch profile + all session analyses in parallel
    const [{ data: profile }, sessionAnalyses] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .maybeSingle(),
      sessionId ? fetchSessionAnalyses(supabase, sessionId, user.id) : Promise.resolve([]),
    ]);

    const rawName =
      profile?.full_name?.trim() ||
      profile?.username?.trim() ||
      user.email?.split('@')[0] ||
      null;
    const firstName = rawName ? rawName.split(/\s+/)[0] : null;

    const systemPrompt = buildSystemPrompt({
      firstName,
      analyses: sessionAnalyses,
    });

    // Strip any client-provided system messages (we own that channel now)
    // and keep only the most recent text turns.
    const recentTurns = newMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-MAX_RECENT_TEXT_MESSAGES);

    const contextMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...recentTurns,
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: contextMessages,
      temperature: 0.7,
      max_tokens: 700,
    });

    const assistantResponse = completion.choices[0]?.message?.content || '';

    return NextResponse.json({ content: assistantResponse });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({
      content:
        "I'm having trouble connecting right now. Try again in a moment — and tell a friend if anything urgent comes up.",
    });
  }
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

async function fetchSessionAnalyses(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  userId: string
) {
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('analysis_ids')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  const ids: string[] = session?.analysis_ids || [];
  if (ids.length === 0) return [];

  const { data: rows } = await supabase
    .from('analysis_results')
    .select(
      'id, created_at, risk_score, trust_score, escalation_index, chat_content, flags'
    )
    .in('id', ids)
    .order('created_at', { ascending: true });

  return rows || [];
}

function buildSystemPrompt({
  firstName,
  analyses,
}: {
  firstName: string | null;
  analyses: any[];
}): string {
  const base = DatingSafetyPromptBuilder.getSystemPrompt();

  const voice = firstName
    ? `Speak directly to the reader, whose first name is ${firstName}. Use "you" throughout. You may use "${firstName}" sparingly for warmth — never in a clinical way. NEVER write "the user", "they should", or any third-person reference to the reader.`
    : `Speak directly to the reader. Use "you" throughout. NEVER write "the user", "they should", or any third-person reference to the reader.`;

  const memoryRule = `
CONVERSATION MEMORY:
You have full memory of this chat session. The recent turns of your conversation with ${firstName ?? 'this person'} are below. Reference earlier things they told you naturally — don't make them repeat themselves.`;

  let analysesBlock = '';
  if (analyses.length > 0) {
    const summaries = analyses.map((a, i) =>
      formatAnalysisForPrompt(a, i + 1, analyses.length)
    );
    analysesBlock = `
ANALYSES IN THIS SESSION:
You have analyzed ${analyses.length} conversation${analyses.length === 1 ? '' : 's'} for ${
      firstName ?? 'this person'
    } in this chat session. Treat these as shared context — when they say "the first chat" or "that screenshot", they mean these. You can quote specific messages, refer to flags by their plain-English title, and link to flags using the format described below.

${summaries.join('\n\n')}
`;
  } else {
    analysesBlock = `
ANALYSES IN THIS SESSION:
No conversations have been analyzed yet in this session. If ${
      firstName ?? 'the reader'
    } wants help, suggest they paste a chat or upload a screenshot.`;
  }

  const flagRefRule = `
FLAG REFERENCING:
When you mention a specific flag from one of the analyses above, wrap the flag title using exactly this format so the UI can make it clickable:
[[FLAG_ID::FLAG_TITLE::FLAG_TYPE]]
where FLAG_ID is the id shown in the analysis block above, FLAG_TITLE is a short readable name (3-5 words), and FLAG_TYPE is "red" or "green". Example: [[flag-abc::Brought up money::red]].
Only wrap flag titles that you actually want to highlight as clickable references. Use it sparingly — at most 2-3 times per response.`;

  const replyRules = `
RESPONSE STYLE:
- Be concise. 2-5 short sentences for most questions. No walls of text.
- Plain English. No clinical jargon, no "boundary enforcement", no "psychological progression".
- One small emoji is fine occasionally. Don't pile them on.
- If the reader seems anxious or scared, lead with warmth before facts.
- If they ask a yes/no question, lead with the answer, then explain.`;

  return [
    base,
    `\nVOICE & TONE (STRICT):\n${voice}`,
    memoryRule,
    analysesBlock,
    flagRefRule,
    replyRules,
  ].join('\n');
}

function formatAnalysisForPrompt(a: any, index: number, total: number): string {
  const flags: any[] = Array.isArray(a.flags) ? a.flags : [];
  const top = pickFlagsForPrompt(flags, 6);
  const chatLines = formatChatLines(a.chat_content);
  const label =
    total === 1
      ? 'Analysis'
      : index === total
      ? `Analysis ${index} (most recent)`
      : `Analysis ${index}`;

  return `${label}:
- Scores: Risk ${a.risk_score ?? '-'}, Trust ${a.trust_score ?? '-'}, Pressure ${a.escalation_index ?? '-'}
- Top patterns found:
${top.map((f) => `  - [${f.id}] ${f.type.toUpperCase()} ${f.severity?.toUpperCase() || ''}: ${f.category} — ${f.message}${f.evidence ? `\n      evidence: "${truncate(f.evidence, 160)}"` : ''}`).join('\n')}
- Conversation analyzed (truncated to ${MAX_CHAT_LINES_PER_ANALYSIS} lines max):
${chatLines}`;
}

function pickFlagsForPrompt(flags: any[], max: number): any[] {
  const order = { critical: 0, high: 1, medium: 2, low: 3 } as Record<string, number>;
  const reds = flags
    .filter((f) => f.type === 'red')
    .sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
  const greens = flags.filter((f) => f.type === 'green');
  const chosen = [...reds.slice(0, Math.max(max - 2, 1)), ...greens.slice(0, 2)];
  return chosen.slice(0, max);
}

function formatChatLines(chatContent: any): string {
  if (!Array.isArray(chatContent)) return '  (chat unavailable)';
  const lines = chatContent
    .slice(0, MAX_CHAT_LINES_PER_ANALYSIS)
    .map(
      (m: any) =>
        `  ${(m.sender || 'unknown').toUpperCase()}: ${truncate(m.content || '', 200)}`
    );
  if (chatContent.length > MAX_CHAT_LINES_PER_ANALYSIS) {
    lines.push(`  ... (${chatContent.length - MAX_CHAT_LINES_PER_ANALYSIS} more messages)`);
  }
  return lines.join('\n');
}

function truncate(s: string, max: number): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
