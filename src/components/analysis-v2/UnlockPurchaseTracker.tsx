'use client';

import { useEffect } from 'react';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics';
import { ONE_TIME_UNLOCK } from '@/lib/plan';

/**
 * Fires a GA4 `purchase` event for a one-time analysis unlock when the user
 * returns from Stripe Checkout (?session_id=...). Runs once, then strips the
 * query params so a refresh doesn't double-count. The webhook is the source of
 * truth for fulfillment; this is purely the conversion signal for analytics.
 */
export default function UnlockPurchaseTracker() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) return;

    trackEvent(ANALYTICS_EVENTS.PURCHASE, {
      value: ONE_TIME_UNLOCK.amountCents / 100,
      currency: ONE_TIME_UNLOCK.currency.toUpperCase(),
      transaction_id: sessionId,
      plan: 'one_time',
    });

    // Remove the checkout params without adding a history entry.
    params.delete('session_id');
    params.delete('canceled');
    const qs = params.toString();
    window.history.replaceState(
      {},
      '',
      window.location.pathname + (qs ? `?${qs}` : '')
    );
  }, []);

  return null;
}
