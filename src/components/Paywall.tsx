'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Lock, Check, ArrowRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics';
import { ONE_TIME_UNLOCK, PREMIUM_PLAN } from '@/lib/plan';

const PERKS = [
  'The full breakdown of every red and green flag',
  'Exact quotes, what each pattern means, and what to do',
  'Copy-paste suggested replies and an exit plan',
];

type Plan = 'one_time' | 'subscription';

/**
 * Upgrade gate shown in place of the full analysis. Two ways to unlock:
 *
 *  - One-time ($8): pay once to view THIS analysis forever. The primary CTA —
 *    it matches the "I have one worrying chat right now" use case.
 *  - Subscription ($25/mo): unlimited analyses + saved history. The upsell.
 *
 * Anonymous (ad-funnel) users first set an email + password to convert their
 * anonymous account into a permanent one — this preserves access to what they
 * pay for and captures the email — then continue to checkout for the chosen plan.
 */
export default function Paywall({
  analysisId,
  className = '',
}: {
  analysisId: string;
  className?: string;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState<Plan | null>(null);
  const [isAnonymous, setIsAnonymous] = useState<boolean | null>(null);
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAnonymous(!!user?.is_anonymous);
    });
  }, [supabase]);

  const goToCheckout = async (plan: Plan) => {
    const endpoint = plan === 'one_time' ? '/api/stripe/unlock' : '/api/stripe/manage';
    const body = plan === 'one_time' ? JSON.stringify({ analysisId }) : undefined;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body,
    });
    if (!res.ok) throw new Error('Could not start checkout.');
    const data = await res.json();

    // The one-time endpoint short-circuits if access already exists.
    if (data?.alreadyUnlocked) {
      window.location.reload();
      return;
    }
    if (!data?.url) throw new Error('Could not start checkout.');

    trackEvent(ANALYTICS_EVENTS.BEGIN_CHECKOUT, {
      plan,
      location: 'paywall',
      value: plan === 'one_time' ? ONE_TIME_UNLOCK.amountCents / 100 : 25,
      currency: 'USD',
    });
    window.location.href = data.url;
  };

  // Entry point for either button. Anonymous users must register first.
  const handlePlan = (plan: Plan) => {
    trackEvent(ANALYTICS_EVENTS.UPGRADE_CLICK, { plan, location: 'paywall', is_anonymous: !!isAnonymous });
    if (isAnonymous) {
      setPendingPlan(plan);
      return;
    }
    startCheckout(plan);
  };

  const startCheckout = async (plan: Plan) => {
    setLoading(plan);
    try {
      await goToCheckout(plan);
    } catch (err) {
      toast.error((err as Error).message || 'Something went wrong. Please try again.');
      setLoading(null);
    }
  };

  // Anonymous → convert to a permanent account, then continue to checkout.
  const handleCreateAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPlan) return;
    if (!email.trim() || password.length < 6) {
      toast.error('Enter your email and a password of at least 6 characters.');
      return;
    }
    setLoading(pendingPlan);
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim(), password });
      if (error) {
        const msg = error.message?.toLowerCase() || '';
        if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
          toast.error('That email already has an account. Please sign in instead.');
        } else {
          toast.error(error.message || 'Could not create your account.');
        }
        setLoading(null);
        return;
      }
      trackEvent(ANALYTICS_EVENTS.SIGN_UP, { method: 'anonymous_convert', location: 'paywall', plan: pendingPlan });
      await goToCheckout(pendingPlan);
    } catch (err) {
      toast.error((err as Error).message || 'Something went wrong. Please try again.');
      setLoading(null);
    }
  };

  // Anonymous → sign in with Google. This works for both brand-new and existing
  // Google accounts (no Supabase "manual linking" needed). The anonymous user is
  // left behind, so we carry ?claim=1 to transfer this analysis to the Google
  // account on return, plus ?checkout to resume payment.
  const handleGoogle = async (plan: Plan) => {
    setLoading(plan);
    try {
      trackEvent(ANALYTICS_EVENTS.SIGN_UP, { method: 'google', location: 'paywall', plan });
      const next = `/dashboard/analysis/${analysisId}?claim=1&checkout=${plan}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      // The browser redirects to Google from here.
    } catch (err) {
      toast.error((err as Error).message || 'Could not continue with Google. Please try email instead.');
      setLoading(null);
    }
  };

  // Resume checkout after returning from a Google account link
  // (/dashboard/analysis/[id]?checkout=one_time|subscription). The user is now
  // permanent, so we go straight to Stripe.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (checkout !== 'one_time' && checkout !== 'subscription') return;
    // Strip the flag so it can't re-fire on refresh or back-navigation.
    params.delete('checkout');
    const qs = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    startCheckout(checkout as Plan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = loading !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-indigo-900/20 ${className}`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 w-52 h-52 rounded-full bg-emerald-400/20 blur-3xl" />
      </div>

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-100">
          <Lock className="w-3.5 h-3.5" />
          Results locked
        </div>

        <h2 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight">
          Unlock your full analysis
        </h2>
        <p className="mt-2 text-indigo-100 leading-relaxed max-w-md">
          We&apos;ve finished reading this conversation. Here&apos;s everything you&apos;ll see:
        </p>

        <ul className="mt-5 space-y-2.5">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-2.5 text-sm text-indigo-50">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-white/15 flex items-center justify-center">
                <Check className="w-3 h-3 text-emerald-300" />
              </span>
              <span className="leading-relaxed">{perk}</span>
            </li>
          ))}
        </ul>

        {/* Anonymous users: create/link an account, then pay for the chosen plan. */}
        {isAnonymous && pendingPlan ? (
          <div className="mt-7 space-y-3 max-w-sm">
            <p className="text-sm font-medium text-white">
              Continue to
              {pendingPlan === 'one_time'
                ? ` unlock this analysis for ${ONE_TIME_UNLOCK.priceLabel}.`
                : ' start your subscription.'}
            </p>

            <button
              type="button"
              onClick={() => handleGoogle(pendingPlan)}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-stone-100 transition-colors shadow disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <GoogleIcon className="w-4 h-4" />
              Continue with Google
            </button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 text-xs text-indigo-200/80 bg-indigo-700/60 rounded">or use email</span>
              </div>
            </div>

            <form onSubmit={handleCreateAndPay} className="space-y-3">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl bg-white/95 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl bg-white/95 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <button
              type="submit"
              disabled={busy}
              className="group w-full inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-base font-semibold text-slate-900 hover:bg-stone-100 transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              {busy ? 'Setting up…' : 'Create account & continue'}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={() => setPendingPlan(null)}
              className="text-xs text-indigo-200/80 underline"
            >
              Back
            </button>
            <p className="text-xs text-indigo-200/80">
              Already have an account?{' '}
              <Link
                href={`/login?next=${encodeURIComponent(`/dashboard/analysis/${analysisId}?claim=1`)}`}
                className="underline font-medium text-white"
              >
                Sign in
              </Link>
            </p>
            </form>
          </div>
        ) : (
          <div className="mt-7 space-y-3">
            {/* Primary: one-time unlock for this analysis. */}
            <button
              onClick={() => handlePlan('one_time')}
              disabled={busy || isAnonymous === null}
              className="group w-full inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-base font-semibold text-slate-900 hover:bg-stone-100 transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading === 'one_time' ? (
                'Starting checkout…'
              ) : (
                <>
                  <Lock className="w-4 h-4 text-indigo-600" />
                  Unlock this analysis — {ONE_TIME_UNLOCK.priceLabel}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>

            {/* Secondary: unlimited subscription. */}
            <button
              onClick={() => handlePlan('subscription')}
              disabled={busy || isAnonymous === null}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white/10 ring-1 ring-white/25 px-6 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading === 'subscription' ? (
                'Starting checkout…'
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  Or go unlimited — {PREMIUM_PLAN.priceLabel}{PREMIUM_PLAN.intervalLabel}
                </>
              )}
            </button>
          </div>
        )}

        <p className="mt-3 text-xs text-indigo-200/80">
          {ONE_TIME_UNLOCK.priceLabel} unlocks this analysis for good · {PREMIUM_PLAN.priceLabel}{PREMIUM_PLAN.intervalLabel} for unlimited · Secure checkout by Stripe.
        </p>
      </div>
    </motion.div>
  );
}

function GoogleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
