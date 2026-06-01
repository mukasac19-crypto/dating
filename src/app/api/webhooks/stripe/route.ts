import { headers } from 'next/headers';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { SUBSCRIPTION_FREE, SUBSCRIPTION_PREMIUM } from '@/lib/subscription';
import Stripe from 'stripe';

// Stripe must receive the raw, unparsed body to verify the signature.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A separate admin client to bypass Row Level Security — webhooks run on the
// server, not as a logged-in user.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Stripe statuses that should grant access. Everything else (past_due,
// canceled, unpaid, incomplete_expired, paused) drops the user to free.
const ACTIVE_STATUSES: Stripe.Subscription.Status[] = ['active', 'trialing'];

type ProfileUpdate = {
  subscription: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  price_id?: string | null;
  subscription_current_period_end?: string | null;
};

function periodEndIso(subscription: Stripe.Subscription): string | null {
  // In recent Stripe API versions the period boundary lives on the subscription
  // item; older versions kept it on the subscription. Read defensively.
  const item = subscription.items?.data?.[0] as
    | (Stripe.SubscriptionItem & { current_period_end?: number })
    | undefined;
  const unix =
    item?.current_period_end ??
    (subscription as unknown as { current_period_end?: number }).current_period_end;
  return typeof unix === 'number' ? new Date(unix * 1000).toISOString() : null;
}

async function applySubscription(subscription: Stripe.Subscription) {
  const isActive = ACTIVE_STATUSES.includes(subscription.status);
  const update: ProfileUpdate = {
    subscription: isActive ? SUBSCRIPTION_PREMIUM : SUBSCRIPTION_FREE,
    stripe_subscription_id: subscription.id,
    price_id: subscription.items?.data?.[0]?.price?.id ?? null,
    subscription_current_period_end: isActive ? periodEndIso(subscription) : null,
  };

  // Prefer matching by the userId we stamped on the subscription metadata; fall
  // back to the Stripe customer id, which we store on first checkout.
  const userId = subscription.metadata?.userId;
  const query = supabaseAdmin.from('profiles').update(update);
  const { error } = userId
    ? await query.eq('id', userId)
    : await query.eq('stripe_customer_id', subscription.customer as string);

  if (error) {
    console.error('Failed to apply subscription update:', error.message, {
      subscriptionId: subscription.id,
      status: subscription.status,
    });
    throw error;
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('Stripe-Signature');

  if (!signature) {
    return new Response('Missing Stripe-Signature header', { status: 400 });
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured.');
    return new Response('Webhook not configured', { status: 500 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error: any) {
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription' || !session.subscription) break;

        const userId = session.metadata?.userId;
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        // Store the customer id immediately, and stamp userId onto the
        // subscription so future subscription.* events can find this profile
        // even without the session metadata.
        if (userId) {
          await supabaseAdmin
            .from('profiles')
            .update({ stripe_customer_id: session.customer as string })
            .eq('id', userId);

          if (subscription.metadata?.userId !== userId) {
            await stripe.subscriptions.update(subscription.id, {
              metadata: { ...subscription.metadata, userId },
            });
            subscription.metadata = { ...subscription.metadata, userId };
          }
        }

        await applySubscription(subscription);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await applySubscription(event.data.object as Stripe.Subscription);
        break;
      }

      default:
        // Ignore unrelated events.
        break;
    }
  } catch (error) {
    // Returning 500 tells Stripe to retry, which is what we want on a transient
    // database failure.
    console.error('Error handling Stripe webhook:', error);
    return new Response('Webhook handler failed', { status: 500 });
  }

  return new Response(null, { status: 200 });
}
