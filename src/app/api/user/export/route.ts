import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

/**
 * Export everything we hold about the signed-in user as a single JSON file.
 * Note: we don't store the raw conversations submitted for analysis (they're
 * discarded after processing), so they don't appear here — only the saved
 * analysis results and account data do.
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const [profile, analyses, saved, sessions, history, feedback, usage] = await Promise.all([
    admin.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    admin.from('analysis_results').select('*').eq('user_id', user.id),
    admin.from('saved_analyses').select('*').eq('user_id', user.id),
    admin.from('chat_sessions').select('*').eq('user_id', user.id),
    admin.from('chat_history').select('*').eq('user_id', user.id),
    admin.from('feedback').select('*').eq('user_id', user.id),
    admin.from('usage_tracking').select('*').eq('user_id', user.id),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
    },
    profile: profile.data ?? null,
    analyses: analyses.data ?? [],
    savedAnalyses: saved.data ?? [],
    chatSessions: sessions.data ?? [],
    chatHistory: history.data ?? [],
    feedback: feedback.data ?? [],
    usage: usage.data ?? [],
  };

  const filename = `swipe-safe-data-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
