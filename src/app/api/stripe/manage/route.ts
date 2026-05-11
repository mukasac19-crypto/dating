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

    // Fetch user's profile to check if they already have a Stripe ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;

    if (!siteUrl) {
      throw new Error('Missing NEXT_PUBLIC_BASE_URL or NEXT_PUBLIC_SITE_URL environment variable.');
    }

    const returnUrl = `${siteUrl}/dashboard/profile`;

    // SCENARIO 1: User is already a subscriber (has stripe_customer_id)
    // Send them to the Customer Portal to manage their sub
    if (profile?.stripe_customer_id) {
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: returnUrl,
      });

      return NextResponse.json({ url: stripeSession.url });
    }

    // SCENARIO 2: User is a new subscriber
    // Create a Checkout Session
    const stripeSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          // REPLACE THIS with your actual Price ID from Stripe Dashboard
          price: 'price_1QjXaUBT4y...', 
          quantity: 1,
        },
      ],
      success_url: `${returnUrl}?success=true`,
      cancel_url: `${returnUrl}?canceled=true`,
      metadata: {
        userId: user.id, // Critical: We pass the Supabase User ID to Stripe
      },
    });

    return NextResponse.json({ url: stripeSession.url });

  } catch (error) {
    console.error('Stripe Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
