'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  AlertTriangle,
  Check,
  type LucideIcon,
} from 'lucide-react';
import type { VerdictMeta } from '@/lib/flag-labels';
import type { AnalysisPreview } from '@/lib/analysis-preview';
import Paywall from '@/components/Paywall';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics';

const VERDICT_ICONS: Record<VerdictMeta['level'], LucideIcon> = {
  safe: ShieldCheck,
  caution: AlertCircle,
  concerning: ShieldAlert,
  danger: AlertTriangle,
};

const VERDICT_GRADIENTS: Record<VerdictMeta['level'], string> = {
  safe: 'from-emerald-100 via-emerald-50 to-white',
  caution: 'from-amber-100 via-amber-50 to-white',
  concerning: 'from-rose-100 via-rose-50 to-white',
  danger: 'from-red-200 via-red-100 to-rose-50',
};

const VERDICT_ICON_TINT: Record<VerdictMeta['level'], string> = {
  safe: 'bg-emerald-500 text-white shadow-emerald-500/30',
  caution: 'bg-amber-500 text-white shadow-amber-500/30',
  concerning: 'bg-rose-500 text-white shadow-rose-500/30',
  danger: 'bg-red-600 text-white shadow-red-600/40',
};

/**
 * What a non-premium user sees on the full-analysis page: enough to know the
 * analysis is done and roughly how it landed, with the substance held behind
 * the paywall. The detailed result never reaches this component.
 */
export default function LockedAnalysisView({
  preview,
  firstName,
}: {
  preview: AnalysisPreview;
  firstName?: string | null;
}) {
  const router = useRouter();
  const { verdict, redCount, greenCount } = preview;
  const Icon = VERDICT_ICONS[verdict.level];

  // A non-premium user reaching this screen has hit the paywall — the key
  // top-of-monetization signal.
  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.PAYWALL_VIEWED, {
      result_id: preview.id,
      verdict: verdict.level,
      red_count: redCount,
      green_count: greenCount,
    });
  }, [preview.id, verdict.level, redCount, greenCount]);

  const timeAgo = useMemo(() => {
    try {
      const date =
        preview.createdAt instanceof Date ? preview.createdAt : new Date(preview.createdAt);
      if (isNaN(date.getTime())) return null;
      return `Analyzed ${formatDistanceToNow(date, { addSuffix: true })}`;
    } catch {
      return null;
    }
  }, [preview.createdAt]);

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <header className="sticky top-0 z-30 bg-stone-50/85 backdrop-blur border-b border-stone-200/70">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="text-sm font-medium text-slate-500">Your analysis</div>
          <div className="w-12" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-10 space-y-6 pb-32">
        {/* Verdict teaser */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${
            VERDICT_GRADIENTS[verdict.level]
          } ring-1 ${verdict.tone.ring} p-6 sm:p-8`}
        >
          <div
            aria-hidden
            className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-white/40 blur-3xl"
          />
          <div className="relative flex items-start gap-5 sm:gap-6">
            <div
              className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                VERDICT_ICON_TINT[verdict.level]
              }`}
            >
              <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="flex-1 min-w-0">
              {timeAgo && (
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">
                  {timeAgo}
                </p>
              )}
              <h1
                className={`text-3xl sm:text-4xl font-semibold tracking-tight ${verdict.tone.text}`}
              >
                {verdict.title}
              </h1>
              <p className="mt-2 text-base text-slate-600">
                {firstName ? `${firstName}, your` : 'Your'} full breakdown is ready below.
              </p>

              {(redCount > 0 || greenCount > 0) && (
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  {redCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full ring-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-white/70 ring-rose-200">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {redCount} red flag{redCount === 1 ? '' : 's'}
                    </span>
                  )}
                  {greenCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full ring-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-white/70 ring-emerald-200">
                      <Check className="w-3.5 h-3.5" />
                      {greenCount} green flag{greenCount === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <Paywall />

        {/* Blurred placeholder hinting at the locked detail */}
        <div className="relative" aria-hidden>
          <div className="space-y-3 blur-sm select-none pointer-events-none">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl bg-white ring-1 ring-stone-200 p-5">
                <div className="h-4 w-1/3 rounded bg-stone-200" />
                <div className="mt-3 h-3 w-full rounded bg-stone-100" />
                <div className="mt-2 h-3 w-4/5 rounded bg-stone-100" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-stone-50" />
        </div>
      </main>
    </div>
  );
}
