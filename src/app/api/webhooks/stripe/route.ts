import { headers } from 'next/headers';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// We need a separate admin client here to bypass Row Level Security (RLS)
// because webhooks run on the server, not as a logged-in user.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('Stripe-Signature') as string;

  let event: Stripe.Event;

  try {
    const stripe = getStripe();

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // Event: Subscription Created
  if (event.type === 'checkout.session.completed') {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const userId = session.metadata?.userId;

    if (userId) {
      await supabaseAdmin
        .from('profiles')
        .update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_status: 'active',
          price_id: subscription.items.data[0].price.id,
        })
        .eq('id', userId);
    }
  }

  // Event: Subscription Deleted (Canceled)
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    
    await supabaseAdmin
      .from('profiles')
      .update({ subscription_status: 'canceled' })
      .eq('stripe_customer_id', subscription.customer as string);
  }

  // Event: Subscription Updated (e.g. Renewed or Payment Failed)
  if (event.type === 'customer.subscription.updated') {
     const subscription = event.data.object as Stripe.Subscription;
     
     await supabaseAdmin
      .from('profiles')
      .update({ subscription_status: subscription.status })
      .eq('stripe_customer_id', subscription.customer as string);
  }

  return new Response(null, { status: 200 });
}
