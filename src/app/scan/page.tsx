'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Check, ScanLine, ShieldCheck, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/Logo';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics';

const STEPS = [
  'Upload a screenshot of your chat',
  'Our AI reads it for scams, manipulation & red flags',
  'Get your verdict in under a minute',
];

export default function ScanPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const startScan = async () => {
    setLoading(true);
    trackEvent(ANALYTICS_EVENTS.SCAN_STARTED, { source: 'scan_landing' });
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Sign the visitor in anonymously so the whole analyze → result pipeline
      // works without a signup. They become a real (emailless) user.
      if (!user) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
      }

      router.push('/dashboard/chat/new');
    } catch (err) {
      console.error('Anonymous start failed:', err);
      toast.error('Could not start your scan. Please try again in a moment.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 antialiased selection:bg-indigo-200/60">
      {/* Minimal header — no nav, keep focus on the CTA */}
      <header className="mx-auto max-w-3xl px-6 pt-6 flex items-center justify-between">
        <Logo className="h-14 w-auto" />
        <Link href="/login" className="text-sm font-medium text-slate-500 hover:text-slate-800">
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pt-10 pb-20 sm:pt-16">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-stone-200 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            No signup to start · 30 seconds
          </div>

          <h1 className="mt-5 text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
            Is your match{' '}
            <span className="relative inline-block">
              <span className="relative z-10">who they say</span>
              <span className="absolute inset-x-0 bottom-1 h-3 sm:h-4 bg-amber-200/70 -z-0 rounded-sm" />
            </span>{' '}
            they are?
          </h1>

          <p className="mt-5 text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
            Upload a screenshot of your chat. Our AI scans it for scams, manipulation, and red
            flags — then gives you a clear verdict and what to do next.
          </p>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={startScan}
            disabled={loading}
            className="group mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-8 py-4 text-base font-semibold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <ScanLine className="w-5 h-5" />
            {loading ? 'Starting…' : 'Analyze a screenshot'}
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
          </motion.button>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" /> Free to start
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-600" /> Your chat isn&apos;t stored
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-600" /> Verdict in under a minute
            </span>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-14 grid sm:grid-cols-3 gap-4">
          {STEPS.map((step, i) => (
            <div
              key={step}
              className="rounded-2xl bg-white ring-1 ring-stone-200 p-5 text-left shadow-sm"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm">
                {i + 1}
              </div>
              <p className="mt-3 text-sm text-slate-700 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>

        {/* Honest pricing note — required so ads don't read as misleading */}
        <div className="mt-10 rounded-2xl bg-white ring-1 ring-stone-200 p-5 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-600 leading-relaxed">
            You&apos;ll see your verdict for free. Unlocking the{' '}
            <span className="font-medium text-slate-900">full breakdown</span> — every flag, what it
            means, and what to do — is part of <span className="font-medium text-slate-900">Premium ($25/month, cancel anytime)</span>.
            By continuing you agree to our{' '}
            <Link href="/terms" className="text-indigo-600 hover:underline">Terms</Link> and{' '}
            <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
