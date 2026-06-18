'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Lock, Check, ArrowRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics';

const PERKS = [
  'The full breakdown of every red and green flag',
  'Exact quotes, what each pattern means, and what to do',
  'Copy-paste suggested replies and an exit plan',
  'Your saved history — revisit any analysis anytime',
];

/**
 * Upgrade gate shown in place of the full analysis for non-premium users.
 *
 * - Permanent users: straight to Stripe Checkout via /api/stripe/manage.
 * - Anonymous (ad-funnel) users: first capture email + password to convert the
 *   anonymous account into a permanent one (preserving their analysis), THEN go
 *   to checkout. This also captures the email before the wallet, enabling
 *   abandoned-checkout follow-up.
 */
export default function Paywall({ className = '' }: { className?: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState<boolean | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAnonymous(!!user?.is_anonymous);
    });
  }, [supabase]);

  const goToCheckout = async () => {
    const res = await fetch('/api/stripe/manage', { method: 'POST' });
    if (!res.ok) throw new Error('Could not start checkout.');
    const data = await res.json();
    if (!data?.url) throw new Error('Could not start checkout.');
    trackEvent(ANALYTICS_EVENTS.BEGIN_CHECKOUT, { location: 'paywall', value: 25, currency: 'USD' });
    window.location.href = data.url;
  };

  // Permanent users (or anyone already registered) → checkout directly.
  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await goToCheckout();
    } catch (err) {
      toast.error((err as Error).message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  // Anonymous users → convert to a permanent account, then checkout.
  const handleCreateAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error('Enter your email and a password of at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: email.trim(),
        password,
      });
      if (error) {
        const msg = error.message?.toLowerCase() || '';
        if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
          toast.error('That email already has an account. Please sign in instead.');
        } else {
          toast.error(error.message || 'Could not create your account.');
        }
        setLoading(false);
        return;
      }
      // Account created/linked — proceed straight to payment.
      trackEvent(ANALYTICS_EVENTS.SIGN_UP, { method: 'anonymous_convert', location: 'paywall' });
      await goToCheckout();
    } catch (err) {
      toast.error((err as Error).message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

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
          We&apos;ve finished reading this conversation. Go premium to see the complete
          breakdown — and unlock every analysis you run.
        </p>

        <ul className="mt-6 space-y-2.5">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-2.5 text-sm text-indigo-50">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-white/15 flex items-center justify-center">
                <Check className="w-3 h-3 text-emerald-300" />
              </span>
              <span className="leading-relaxed">{perk}</span>
            </li>
          ))}
        </ul>

        {/* Anonymous users: register inline, then pay. */}
        {isAnonymous && showForm ? (
          <form onSubmit={handleCreateAndPay} className="mt-7 space-y-3 max-w-sm">
            <p className="text-sm font-medium text-white">Create your account to continue</p>
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
              disabled={loading}
              className="group w-full inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-base font-semibold text-slate-900 hover:bg-stone-100 transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              {loading ? 'Setting up…' : 'Create account & continue'}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <p className="text-xs text-indigo-200/80">
              Already have an account?{' '}
              <Link href="/login" className="underline font-medium text-white">
                Sign in
              </Link>
            </p>
          </form>
        ) : (
          <button
            onClick={() => {
              trackEvent(ANALYTICS_EVENTS.UPGRADE_CLICK, {
                location: 'paywall',
                is_anonymous: !!isAnonymous,
              });
              return isAnonymous ? setShowForm(true) : handleUpgrade();
            }}
            disabled={loading || isAnonymous === null}
            className="group mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-base font-semibold text-slate-900 hover:bg-stone-100 transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {loading ? (
              'Starting checkout…'
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Upgrade to view results
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        )}

        <p className="mt-3 text-xs text-indigo-200/80">
          $25/month · Cancel anytime · Secure checkout by Stripe.
        </p>
      </div>
    </motion.div>
  );
}
