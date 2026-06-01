-- Stripe billing support for profiles.
-- The `subscription` column already exists ('free' | 'premium') and remains the
-- source of truth for whether a user has access. These columns add the Stripe
-- bookkeeping the webhook and billing portal need.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS price_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE;

-- The webhook looks up profiles by Stripe customer id, so index it.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
