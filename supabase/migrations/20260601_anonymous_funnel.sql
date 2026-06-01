-- Support the ad-funnel anonymous flow (Supabase Anonymous Sign-Ins).
--
-- 1) Anonymous users have no email, but profiles.email is NOT NULL and the
--    handle_new_user() trigger copies auth.users.email into it on signup. With
--    a null email that insert fails, which makes signInAnonymously() fail.
--    Make email nullable. (UNIQUE still holds: Postgres treats NULLs as distinct,
--    so many anonymous profiles with null email are fine.)
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

-- 2) Periodic cleanup of stale, unconverted anonymous accounts so they don't
--    pile up. Deletes anonymous auth users older than 7 days that never became
--    premium; the delete cascades to their profile, analyses, sessions, etc.
--    Schedule via Supabase cron / pg_cron, e.g. daily:
--      select cron.schedule('cleanup-anon', '0 3 * * *', $$select public.cleanup_anonymous_users()$$);
CREATE OR REPLACE FUNCTION public.cleanup_anonymous_users()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users u
  WHERE u.is_anonymous = true
    AND u.created_at < NOW() - INTERVAL '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = u.id AND p.subscription = 'premium'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
