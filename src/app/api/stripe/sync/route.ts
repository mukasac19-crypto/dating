import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';
import { SUBSCRIPTION_FREE, SUBSCRIPTION_PREMIUM } from '@/lib/subscription';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const ACTIVE_STATUSES: Stripe.Subscription.Status[] = ['active', 'trialing'];

function periodEndIso(subscription: Stripe.Subscription): string | null {
  const item = subscription.items?.data?.[0] as
    | (Stripe.SubscriptionItem & { current_period_end?: number })
    | undefined;
  const unix =
    item?.current_period_end ??
    (subscription as unknown as { current_period_end?: number }).current_period_end;
  return typeof unix === 'number' ? new Date(unix * 1000).toISOString() : null;
}

/**
 * Reconcile the signed-in user's plan with Stripe (the source of truth).
 *
 * The webhook is the primary path, but it can be missed (misconfigured endpoint,
 * local dev without `stripe listen`, transient failures). This endpoint asks
 * Stripe directly for the user's subscription and writes the result to the
 * profile, so premium access — and the unlocking of previously-locked analyses —
 * doesn't hang on a single webhook delivery.
 */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  try {
    const stripe = getStripe();

    // Find the Stripe customer: by stored id, else by email.
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    let customerId: string | null = profile?.stripe_customer_id ?? null;
    if (!customerId && user.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      customerId = customers.data[0]?.id ?? null;
    }

    if (!customerId) {
      // No Stripe customer at all → ensure we're marked free.
      await admin.from('profiles').update({ subscription: SUBSCRIPTION_FREE }).eq('id', user.id);
      return NextResponse.json({ premium: false });
    }

    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    });
    const active = subs.data.find((s) => ACTIVE_STATUSES.includes(s.status));
    const isActive = !!active;

    await admin
      .from('profiles')
      .update({
        subscription: isActive ? SUBSCRIPTION_PREMIUM : SUBSCRIPTION_FREE,
        stripe_customer_id: customerId,
        stripe_subscription_id: active?.id ?? null,
        price_id: active?.items?.data?.[0]?.price?.id ?? null,
        subscription_current_period_end: active ? periodEndIso(active) : null,
      })
      .eq('id', user.id);

    // Stamp our user id on the subscription so future webhooks map cleanly.
    if (active && active.metadata?.userId !== user.id) {
      await stripe.subscriptions.update(active.id, {
        metadata: { ...active.metadata, userId: user.id },
      });
    }

    return NextResponse.json({ premium: isActive });
  } catch (error) {
    console.error('Stripe sync error:', error);
    return NextResponse.json({ error: 'Failed to sync subscription' }, { status: 500 });
  }
}
