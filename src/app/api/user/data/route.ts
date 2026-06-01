import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

/**
 * Delete the user's content — analyses, chat history, saved items, feedback,
 * and usage — while keeping the account itself. Use /api/user (DELETE) to
 * remove the account entirely.
 */
export async function DELETE() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Delete in FK-safe order (children before parents). analysis_results would
  // cascade to feedback/saved_analyses anyway, but we're explicit for clarity.
  const steps = [
    admin.from('feedback').delete().eq('user_id', user.id),
    admin.from('saved_analyses').delete().eq('user_id', user.id),
    admin.from('chat_history').delete().eq('user_id', user.id),
    admin.from('chat_sessions').delete().eq('user_id', user.id),
    admin.from('analysis_results').delete().eq('user_id', user.id),
    admin.from('usage_tracking').delete().eq('user_id', user.id),
  ];

  for (const step of steps) {
    const { error } = await step;
    if (error) {
      console.error('Error deleting user data:', error.message);
      return NextResponse.json({ error: 'Failed to delete your data.' }, { status: 500 });
    }
  }

  // Reset the usage counter so the cleared account starts fresh.
  await admin.from('profiles').update({ analysis_count: 0 }).eq('id', user.id);

  return NextResponse.json({ message: 'Your data has been deleted.' }, { status: 200 });
}
