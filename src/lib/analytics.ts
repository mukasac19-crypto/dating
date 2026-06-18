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

/**
 * Maps our funnel events to Meta Pixel events. `standard: true` uses a Meta
 * standard event (optimizable as a campaign objective); the rest are custom
 * events (still usable as custom conversions). Events not listed here are
 * GA-only.
 */
const META_EVENT_MAP: Record<string, { event: string; standard: boolean }> = {
  [ANALYTICS_EVENTS.SCAN_STARTED]: { event: 'ScanStarted', standard: false },
  [ANALYTICS_EVENTS.ANALYSIS_STARTED]: { event: 'AnalysisStarted', standard: false },
  [ANALYTICS_EVENTS.ANALYSIS_COMPLETED]: { event: 'AnalysisCompleted', standard: false },
  [ANALYTICS_EVENTS.PAYWALL_VIEWED]: { event: 'PaywallViewed', standard: false },
  [ANALYTICS_EVENTS.UPGRADE_CLICK]: { event: 'UpgradeClick', standard: false },
  [ANALYTICS_EVENTS.BEGIN_CHECKOUT]: { event: 'InitiateCheckout', standard: true },
  [ANALYTICS_EVENTS.SIGN_UP]: { event: 'CompleteRegistration', standard: true },
  [ANALYTICS_EVENTS.PURCHASE]: { event: 'Purchase', standard: true },
};

function trackMeta(name: string, params: EventParams): void {
  const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
  if (typeof fbq !== 'function') return;
  const mapping = META_EVENT_MAP[name];
  if (!mapping) return;
  // Meta wants value + currency on monetary events (Purchase, InitiateCheckout).
  const fbParams: Record<string, unknown> = {};
  if (typeof params.value === 'number') fbParams.value = params.value;
  if (typeof params.currency === 'string') fbParams.currency = params.currency;
  fbq(mapping.standard ? 'track' : 'trackCustom', mapping.event, fbParams);
}

/** Fire a GA4 event (and its Meta Pixel counterpart). No-ops on the server. */
export function trackEvent(name: string, params: EventParams = {}): void {
  if (typeof window === 'undefined') return;
  try {
    sendGAEvent('event', name, params);
  } catch {
    // Analytics must never break the app.
  }
  try {
    trackMeta(name, params);
  } catch {
    // ignore
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
  // Meta only auto-fires PageView on the initial load; mirror SPA navigations.
  try {
    const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
    if (typeof fbq === 'function') fbq('track', 'PageView');
  } catch {
    // ignore
  }
}
