'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/analytics';

/**
 * Maps a pathname to a clean, distinct page title for GA4. Without this, almost
 * every route inherits the same default <title> ("Swipe Safe - Protect Your
 * Heart"), so the GA4 Pages report can't tell the funnel steps apart.
 */
function titleFor(pathname: string): string {
  if (pathname === '/') return 'Home';
  if (pathname === '/scan') return 'Scan (ad landing)';
  if (pathname === '/login') return 'Login';
  if (pathname === '/signup') return 'Signup';
  if (pathname === '/dashboard') return 'Dashboard';
  if (pathname === '/dashboard/profile') return 'Profile / Billing';
  if (pathname === '/dashboard/history') return 'History';
  if (pathname.startsWith('/dashboard/chat')) return 'Chat / Analyze';
  if (pathname.startsWith('/dashboard/analysis')) return 'Analysis result';
  if (pathname.startsWith('/dashboard/history/')) return 'Saved analysis';
  if (pathname === '/about') return 'About';
  if (pathname === '/privacy') return 'Privacy Policy';
  if (pathname === '/terms') return 'Terms of Service';
  return pathname;
}

/**
 * Sends a page_view on every client-side route change so the whole funnel is
 * visible in GA4 (the base GA script only fires on the initial load).
 */
export default function AnalyticsRouteTracker() {
  const pathname = usePathname();
  // The base GA script already fires a page_view for the initial load, so we
  // only emit titled page_views for subsequent client-side navigations to avoid
  // double-counting the landing page.
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!pathname) return;
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    trackPageView(pathname, titleFor(pathname));
  }, [pathname]);

  return null;
}
