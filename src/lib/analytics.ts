'use client';

import { sendGAEvent } from '@next/third-parties/google';

/**
 * Funnel instrumentation for GA4.
 *
 * Every funnel step fires a named event here so the conversion path
 * (scan → analyze → paywall → upgrade → sign up → purchase) is measurable in
 * GA4. Without these, GA only sees page_views — and because most routes share
 * the same <title>, the Pages report collapses the whole funnel into one row.
 *
 * Mark the key ones (sign_up, begin_checkout, purchase) as "Key events" in the
 * GA4 UI: Admin → Events → toggle "Mark as key event".
 */
export const ANALYTICS_EVENTS = {
  SCAN_STARTED: 'scan_started',
  ANALYSIS_STARTED: 'analysis_started',
  ANALYSIS_COMPLETED: 'analysis_completed',
  PAYWALL_VIEWED: 'paywall_viewed',
  UPGRADE_CLICK: 'upgrade_click',
  BEGIN_CHECKOUT: 'begin_checkout',
  SIGN_UP: 'sign_up',
  PURCHASE: 'purchase',
} as const;

type EventParams = Record<string, string | number | boolean | null | undefined>;

/** Fire a GA4 event. No-ops on the server or if analytics hasn't loaded. */
export function trackEvent(name: string, params: EventParams = {}): void {
  if (typeof window === 'undefined') return;
  try {
    sendGAEvent('event', name, params);
  } catch {
    // Analytics must never break the app.
  }
}

/**
 * Fire an explicit page_view with a human-readable title. The GA4 script only
 * sends a page_view on the first full page load; client-side route changes in
 * the App Router don't, so the funnel pages would otherwise be invisible.
 */
export function trackPageView(path: string, title: string): void {
  if (typeof window === 'undefined') return;
  try {
    sendGAEvent('event', 'page_view', {
      page_path: path,
      page_title: title,
      page_location: window.location.href,
    });
  } catch {
    // ignore
  }
}
