import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      console.error('Missing STRIPE_PRICE_ID environment variable.');
      return new NextResponse('Billing is not configured', { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      throw new Error('Missing NEXT_PUBLIC_BASE_URL or NEXT_PUBLIC_SITE_URL environment variable.');
    }
    const returnUrl = `${siteUrl}/dashboard/profile`;

    // Fetch the user's profile to see if they already have a Stripe customer.
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    // SCENARIO 1: Existing customer → send them to the Customer Portal to manage
    // (upgrade, update card, cancel, or resubscribe).
    if (profile?.stripe_customer_id) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: returnUrl,
      });
      return NextResponse.json({ url: portalSession.url });
    }

    // SCENARIO 2: New subscriber → create a Checkout Session.
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${returnUrl}?success=true`,
      cancel_url: `${returnUrl}?canceled=true`,
      allow_promotion_codes: true,
      // Stamp the Supabase user id on both the session and the resulting
      // subscription so the webhook can reliably map events back to this user.
      metadata: { userId: user.id },
      subscription_data: { metadata: { userId: user.id } },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Stripe Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
