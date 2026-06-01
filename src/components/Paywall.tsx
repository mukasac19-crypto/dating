'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Check, ArrowRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const PERKS = [
  'The full breakdown of every red and green flag',
  'Exact quotes, what each pattern means, and what to do',
  'Copy-paste suggested replies and an exit plan',
  'Your saved history — revisit any analysis anytime',
];

/**
 * Upgrade gate shown in place of the full analysis for non-premium users.
 * Kicks off a Stripe Checkout (or Customer Portal) session via /api/stripe/manage.
 */
export default function Paywall({ className = '' }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/manage', { method: 'POST' });
      if (!res.ok) throw new Error('Could not start checkout.');
      const data = await res.json();
      if (data?.url) {
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

        <button
          onClick={handleUpgrade}
          disabled={loading}
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

        <p className="mt-3 text-xs text-indigo-200/80">
          Cancel anytime from your profile. Secure checkout by Stripe.
        </p>
      </div>
    </motion.div>
  );
}
