import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';
import { isPremium } from '@/lib/subscription';
import { isAnalysisUnlocked, ONE_TIME_UNLOCK_TYPE } from '@/lib/unlock';
import { ONE_TIME_UNLOCK } from '@/lib/plan';

/**
 * Starts a one-time ("pay per analysis") Stripe Checkout for a single analysis.
 * On success the user is returned to the analysis page with the session id, which
 * the page reconciles into an unlock row (the webhook also records it as a
 * backup). Anonymous users can pay too — Stripe collects their email at checkout,
 * which doubles as lead capture.
 */
export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { analysisId } = await req.json().catch(() => ({ analysisId: null }));
    if (!analysisId || typeof analysisId !== 'string') {
      return NextResponse.json({ error: 'Missing analysisId' }, { status: 400 });
    }

    // The analysis must exist and belong to this user.
    const { data: analysis } = await supabase
      .from('analysis_results')
      .select('id, user_id')
      .eq('id', analysisId)
      .maybeSingle();
    if (!analysis || analysis.user_id !== user.id) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Nothing to buy if they already have access.
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription, subscription_current_period_end')
      .eq('id', user.id)
      .maybeSingle();
    if (isPremium(profile) || (await isAnalysisUnlocked(supabase, user.id, analysisId))) {
      return NextResponse.json({ alreadyUnlocked: true });
    }

    const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      throw new Error('Missing NEXT_PUBLIC_BASE_URL or NEXT_PUBLIC_SITE_URL environment variable.');
    }
    const analysisUrl = `${siteUrl}/dashboard/analysis/${analysisId}`;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: ONE_TIME_UNLOCK.currency,
            unit_amount: ONE_TIME_UNLOCK.amountCents,
            product_data: { name: ONE_TIME_UNLOCK.productName },
          },
        },
      ],
      // {CHECKOUT_SESSION_ID} is substituted by Stripe on redirect; the analysis
      // page uses it to reconcile the unlock immediately.
      success_url: `${analysisUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${analysisUrl}?canceled=true`,
      allow_promotion_codes: true,
      metadata: { userId: user.id, analysisId, type: ONE_TIME_UNLOCK_TYPE },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Stripe unlock error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
