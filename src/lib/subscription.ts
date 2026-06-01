import type { Database } from '@/types/supabase';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export const SUBSCRIPTION_FREE = 'free';
export const SUBSCRIPTION_PREMIUM = 'premium';

/**
 * Whether a profile currently has premium access.
 *
 * The `subscription` column is the source of truth — the Stripe webhook flips it
 * to 'premium' on an active subscription and back to 'free' when it ends. As a
 * safety net we also honor a still-valid `subscription_current_period_end`, so a
 * user keeps access through the period they already paid for even if a webhook is
 * briefly delayed.
 */
export function isPremium(
  profile:
    | Pick<ProfileRow, 'subscription' | 'subscription_current_period_end'>
    | null
    | undefined
): boolean {
  if (!profile) return false;
  if (profile.subscription === SUBSCRIPTION_PREMIUM) return true;

  const periodEnd = profile.subscription_current_period_end;
  if (periodEnd) {
    const end = new Date(periodEnd).getTime();
    if (!Number.isNaN(end) && end > Date.now()) return true;
  }
  return false;
}
