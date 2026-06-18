'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics';

/**
 * Starts the upgrade flow from anywhere. If the visitor is signed in we kick off
 * a Stripe Checkout/Portal session via /api/stripe/manage; otherwise we send
 * them to sign up first (they can pay from their profile right after).
 */
export default function UpgradeButton({
  className = '',
  children = 'Get Premium',
  loadingLabel = 'Loading…',
}: {
  className?: string;
  children?: React.ReactNode;
  loadingLabel?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const onClick = async () => {
    setLoading(true);
    trackEvent(ANALYTICS_EVENTS.UPGRADE_CLICK, { location: 'pricing' });
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/signup');
        return;
      }

      const res = await fetch('/api/stripe/manage', { method: 'POST' });
      if (!res.ok) throw new Error('Could not start checkout.');
      const data = await res.json();
      if (data?.url) {
        trackEvent(ANALYTICS_EVENTS.BEGIN_CHECKOUT, { location: 'pricing', value: 25, currency: 'USD' });
        window.location.href = data.url;
      } else {
        throw new Error('Could not start checkout.');
      }
    } catch (err) {
      toast.error((err as Error).message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <button onClick={onClick} disabled={loading} className={className}>
      {loading ? loadingLabel : children}
    </button>
  );
}
