-- The app (profile editing, personalized greetings) and the generated TypeScript
-- types expect `full_name` and `username` on profiles, but these columns were
-- never added to the database. Their absence made every SELECT that listed them
-- fail with "column profiles.full_name does not exist" — which silently broke
-- name personalization and, once subscription was read in the same SELECT, broke
-- premium gating in the sidebar and the analysis page (null row => treated free).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT;
