'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Share2,
  Copy,
  Printer,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Check,
  Sparkles,
  MessageCircle,
  Phone,
  Clock,
  TrendingUp,
  Gauge,
  Eye,
  EyeOff,
  Video,
  Ban,
  Hourglass,
  Users,
  Send,
  type LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { AnalysisResult, Flag } from '@/types';
import {
  getVerdict,
  pickTopThings,
  pickNextSteps,
  toPlainFlag,
  getSeverityChip,
  getCategoryIcon,
  type PlainFlag,
  type VerdictMeta,
} from '@/lib/flag-labels';

interface Props {
  analysis: AnalysisResult;
  firstName?: string | null;
}

export default function AnalysisView({ analysis, firstName }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusFlagId = searchParams?.get('focus') ?? null;
  const verdict = useMemo(() => getVerdict(analysis), [analysis]);
  const topThings = useMemo(() => pickTopThings(analysis.flags || [], 3), [analysis.flags]);
  const nextSteps = useMemo(() => pickNextSteps(analysis, 3), [analysis]);
  const allPlainFlags = useMemo(
    () => (analysis.flags || []).map(toPlainFlag),
    [analysis.flags]
  );
  const redCount = useMemo(
    () => (analysis.flags || []).filter((f) => f.type === 'red').length,
    [analysis.flags]
  );
  const greenCount = useMemo(
    () => (analysis.flags || []).filter((f) => f.type === 'green').length,
    [analysis.flags]
  );

  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (!focusFlagId) return;
    const el = document.getElementById(`flag-${focusFlagId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusFlagId]);

  const fullReport = useMemo(
    () => buildFullReport(verdict, analysis, allPlainFlags, nextSteps),
    [verdict, analysis, allPlainFlags, nextSteps]
  );

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullReport);
      toast.success('Full analysis copied. Paste it anywhere.');
      setShowShare(false);
    } catch {
      toast.error("Couldn't copy. Try selecting the text instead.");
    }
  };

  const onShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: 'Swipe Safe — full analysis',
          text: fullReport,
        });
        setShowShare(false);
        return;
      } catch {
        /* fall through to copy */
      }
    }
    onCopy();
  };

  const onPrint = () => {
    window.print();
    setShowShare(false);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      {verdict.level === 'danger' && <DangerBanner />}

      {/* Top bar */}
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
          <button
            onClick={() => setShowShare(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-stone-200 hover:bg-stone-100 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-10 space-y-8 pb-32">
        <VerdictHero
          verdict={verdict}
          firstName={firstName ?? null}
          redCount={redCount}
          greenCount={greenCount}
          createdAt={analysis.createdAt}
        />

        <ScoreStrip analysis={analysis} />

        <TopThings items={topThings} focusFlagId={focusFlagId} />

        <NextSteps steps={nextSteps} />

        <DeepDetails analysis={analysis} allFlags={allPlainFlags} focusFlagId={focusFlagId} />

        <SafetyReminders verdictLevel={verdict.level} />

        <Footer />
      </main>

      <AnimatePresence>
        {showShare && (
          <ShareSheet
            onClose={() => setShowShare(false)}
            onCopy={onCopy}
            onShare={onShare}
            onPrint={onPrint}
            summary={fullReport}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Critical-danger sticky banner                                             */
/* -------------------------------------------------------------------------- */

function DangerBanner() {
  return (
    <div className="sticky top-0 z-40 bg-red-600 text-white">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-2.5 flex items-center gap-3">
        <Phone className="w-4 h-4 flex-shrink-0" />
        <p className="text-xs sm:text-sm leading-snug">
          <span className="font-semibold">In immediate danger?</span> Call your local emergency
          number. US: <a href="tel:988" className="underline font-semibold">988</a> or text{' '}
          <span className="font-semibold">HOME to 741741</span>.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Verdict hero                                                              */
/* -------------------------------------------------------------------------- */

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

function VerdictHero({
  verdict,
  firstName,
  redCount,
  greenCount,
  createdAt,
}: {
  verdict: VerdictMeta;
  firstName: string | null;
  redCount: number;
  greenCount: number;
  createdAt: Date | string;
}) {
  const Icon = VERDICT_ICONS[verdict.level];
  const gradient = VERDICT_GRADIENTS[verdict.level];
  const iconTint = VERDICT_ICON_TINT[verdict.level];
  const isDanger = verdict.level === 'danger';

  const greeting = firstName
    ? `Hey ${firstName} — ${lowerFirst(verdict.oneLine)}`
    : verdict.oneLine;

  const timeAgo = useMemo(() => {
    try {
      const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
      if (isNaN(date.getTime())) return null;
      return `Analyzed ${formatDistanceToNow(date, { addSuffix: true })}`;
    } catch {
      return null;
    }
  }, [createdAt]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} ring-1 ${verdict.tone.ring} p-6 sm:p-8`}
    >
      <div
        aria-hidden
        className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-white/40 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-20 -left-20 w-52 h-52 rounded-full bg-white/30 blur-3xl"
      />

      <div className="relative flex items-start gap-5 sm:gap-6">
        {/* Icon badge */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex-shrink-0"
        >
          <div className="relative">
            {isDanger && (
              <motion.div
                animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                className="absolute inset-0 rounded-2xl bg-red-500"
              />
            )}
            <div
              className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg ${iconTint}`}
            >
              <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
          </div>
        </motion.div>

        {/* Copy */}
        <div className="flex-1 min-w-0">
          {timeAgo && (
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">
              {timeAgo}
            </p>
          )}
          <h1 className={`text-3xl sm:text-4xl font-semibold tracking-tight ${verdict.tone.text}`}>
            {verdict.title}
          </h1>
          <p className={`mt-2 text-base sm:text-lg leading-relaxed ${verdict.tone.text} opacity-90`}>
            {greeting}
          </p>

          {/* Quick stats */}
          {(redCount > 0 || greenCount > 0) && (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {redCount > 0 && (
                <StatPill
                  icon={AlertTriangle}
                  label={`${redCount} red flag${redCount === 1 ? '' : 's'}`}
                  tint="text-rose-700 bg-white/70 ring-rose-200"
                />
              )}
              {greenCount > 0 && (
                <StatPill
                  icon={Check}
                  label={`${greenCount} green flag${greenCount === 1 ? '' : 's'}`}
                  tint="text-emerald-700 bg-white/70 ring-emerald-200"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

function StatPill({ icon: Icon, label, tint }: { icon: LucideIcon; label: string; tint: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 px-2.5 py-1 text-xs font-semibold ${tint}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Score strip                                                               */
/* -------------------------------------------------------------------------- */

function ScoreStrip({ analysis }: { analysis: AnalysisResult }) {
  const items = [
    {
      icon: Gauge,
      label: 'Risk',
      sub: 'How worrying it looks',
      value: analysis.riskScore ?? 0,
      bar: 'bg-rose-500',
      track: 'bg-rose-100',
      iconTint: 'text-rose-600 bg-rose-100',
    },
    {
      icon: ShieldCheck,
      label: 'Trust',
      sub: 'Positive signals',
      value: analysis.trustScore ?? 0,
      bar: 'bg-emerald-500',
      track: 'bg-emerald-100',
      iconTint: 'text-emerald-600 bg-emerald-100',
    },
    {
      icon: TrendingUp,
      label: 'Pressure',
      sub: 'How fast things move',
      value: analysis.escalationIndex ?? 0,
      bar: 'bg-indigo-500',
      track: 'bg-indigo-100',
      iconTint: 'text-indigo-600 bg-indigo-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-2xl bg-white ring-1 ring-stone-200 p-4 transition-shadow hover:shadow-sm"
        >
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${it.iconTint}`}>
              <it.icon className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">{it.label}</h4>
            <span className="ml-auto text-xl font-semibold text-slate-900 tabular-nums">
              {it.value}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{it.sub}</p>
          <div className={`mt-3 h-1.5 rounded-full overflow-hidden ${it.track}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, it.value))}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className={`h-full ${it.bar}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Top things to know                                                        */
/* -------------------------------------------------------------------------- */

function TopThings({ items, focusFlagId }: { items: PlainFlag[]; focusFlagId: string | null }) {
  if (items.length === 0) {
    return (
      <Section title="Top things to know">
        <div className="rounded-2xl bg-white ring-1 ring-stone-200 p-6 text-slate-600">
          Nothing stood out as a strong signal in this conversation.
        </div>
      </Section>
    );
  }

  return (
    <Section title="Top things to know" subtitle="The most important takeaways, in plain words.">
      <ul className="space-y-3">
        {items.map((item) => (
          <FlagCard key={item.id} flag={item} defaultOpen={item.id === focusFlagId} />
        ))}
      </ul>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Flag card                                                                 */
/* -------------------------------------------------------------------------- */

const SEVERITY_ACCENT: Record<NonNullable<Flag['severity']>, string> = {
  critical: 'bg-red-600',
  high: 'bg-rose-500',
  medium: 'bg-amber-500',
  low: 'bg-stone-400',
};

const SEVERITY_SURFACE: Record<NonNullable<Flag['severity']>, string> = {
  critical: 'bg-red-50/60 ring-red-200',
  high: 'bg-rose-50/60 ring-rose-200',
  medium: 'bg-amber-50/40 ring-amber-200',
  low: 'bg-white ring-stone-200',
};

function FlagCard({ flag, defaultOpen = false }: { flag: PlainFlag; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const chip = getSeverityChip(flag.raw);
  const CategoryIcon = getCategoryIcon(flag.raw.category);

  const isGreen = flag.type === 'green';
  const accent = isGreen ? 'bg-emerald-500' : SEVERITY_ACCENT[flag.severity ?? 'low'];
  const surface = isGreen
    ? 'bg-emerald-50/60 ring-emerald-200'
    : SEVERITY_SURFACE[flag.severity ?? 'low'];
  const iconTint = isGreen
    ? 'bg-emerald-100 text-emerald-700'
    : flag.severity === 'critical' || flag.severity === 'high'
    ? 'bg-rose-100 text-rose-700'
    : flag.severity === 'medium'
    ? 'bg-amber-100 text-amber-700'
    : 'bg-stone-100 text-stone-700';

  return (
    <li id={`flag-${flag.id}`}>
      <motion.div
        layout
        className={`relative rounded-2xl ring-1 ${surface} overflow-hidden`}
      >
        {/* Severity accent bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />

        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full text-left p-4 pl-5 sm:p-5 sm:pl-6 flex items-start gap-3 sm:gap-4"
        >
          <div
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconTint}`}
          >
            <CategoryIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="text-base font-semibold text-slate-900">{flag.title}</h3>
              {chip && (
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${chip.className}`}
                >
                  {chip.label}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">{flag.oneLine}</p>
          </div>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 mt-1.5 text-slate-400"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <FlagDetails flag={flag} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Flag details — Their words / The pattern / Your move                       */
/* -------------------------------------------------------------------------- */

function FlagDetails({ flag }: { flag: PlainFlag }) {
  const f = flag.raw;
  return (
    <div className="px-4 pl-5 sm:px-5 sm:pl-6 pb-5 pt-1 space-y-5 border-t border-dashed border-stone-200/80">
      {/* Their words — chat bubble style */}
      {f.evidence && (
        <DetailBlock label="Their words" icon={MessageCircle}>
          <ChatBubbleQuote text={f.evidence} />
        </DetailBlock>
      )}

      {/* The pattern — meaning + psychological insight */}
      {(f.meaning || f.psychologicalInsight) && (
        <DetailBlock label="The pattern" icon={Eye}>
          <div className="space-y-2.5">
            {f.meaning && (
              <p className="text-sm text-slate-700 leading-relaxed">{f.meaning}</p>
            )}
            {f.psychologicalInsight && (
              <div className="rounded-xl bg-white/70 ring-1 ring-stone-200 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  What it likely means
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">{f.psychologicalInsight}</p>
              </div>
            )}
          </div>
        </DetailBlock>
      )}

      {/* Your move — what to do, suggested reply, exit strategy */}
      {(f.whatToDo || f.aiSuggestedReply || f.exitStrategy) && (
        <DetailBlock label="Your move" icon={ShieldCheck}>
          <div className="space-y-3">
            {f.whatToDo && (
              <p className="text-sm text-slate-700 leading-relaxed">{f.whatToDo}</p>
            )}
            {f.aiSuggestedReply?.content && (
              <DraftReply reply={f.aiSuggestedReply} />
            )}
            {f.exitStrategy && (
              <div className="rounded-xl bg-rose-50 ring-1 ring-rose-200 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 mb-1 flex items-center gap-1.5">
                  <Ban className="w-3 h-3" />
                  If you want to step away
                </p>
                <p className="text-sm text-rose-950 leading-relaxed">{f.exitStrategy}</p>
              </div>
            )}
          </div>
        </DetailBlock>
      )}
    </div>
  );
}

function DetailBlock({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</h4>
      </div>
      {children}
    </div>
  );
}

function ChatBubbleQuote({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center flex-shrink-0 text-xs font-semibold">
        T
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
          Them
        </p>
        <div className="rounded-2xl rounded-tl-sm bg-white ring-1 ring-stone-200 px-3 py-2 text-sm text-slate-800 leading-relaxed">
          “{text}”
        </div>
      </div>
    </div>
  );
}

function DraftReply({
  reply,
}: {
  reply: { content: string; tone: string; purpose?: string };
}) {
  return (
    <div className="rounded-2xl bg-indigo-50/60 ring-1 ring-indigo-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 flex items-center gap-1.5">
          <Send className="w-3 h-3" />
          You could reply
        </p>
        <span className="text-[10px] font-medium text-indigo-600 capitalize">{reply.tone}</span>
      </div>
      <p className="text-sm text-indigo-950 leading-relaxed mb-3">{reply.content}</p>
      <button
        onClick={() => {
          navigator.clipboard.writeText(reply.content);
          toast.success('Reply copied.');
        }}
        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100 transition-colors"
      >
        <Copy className="w-3 h-3" />
        Copy
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Next steps                                                                */
/* -------------------------------------------------------------------------- */

function inferStepIcon(step: string): LucideIcon {
  const s = step.toLowerCase();
  if (/(video|face[\s-]?time|call)/.test(s)) return Video;
  if (/(block|stop|end|cut|never|don'?t|avoid|do not)/.test(s)) return Ban;
  if (/(tell|friend|family|share|report|someone)/.test(s)) return Users;
  if (/(ask|question|clarif)/.test(s)) return MessageCircle;
  if (/(wait|slow|pace|time)/.test(s)) return Hourglass;
  if (/(watch|notice|look|observ)/.test(s)) return Eye;
  return ShieldCheck;
}

function NextSteps({ steps }: { steps: string[] }) {
  if (steps.length === 0) return null;

  return (
    <Section title="What to do next" subtitle="Concrete moves you can make today.">
      <ol className="space-y-2.5">
        {steps.map((step, i) => {
          const Icon = inferStepIcon(step);
          return (
            <li
              key={i}
              className="flex items-start gap-3 rounded-2xl bg-white ring-1 ring-stone-200 p-4 sm:p-5 transition-shadow hover:shadow-sm"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Icon className="w-[18px] h-[18px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600 mb-0.5">
                  Step {i + 1}
                </p>
                <p className="text-sm sm:text-base text-slate-800 leading-relaxed">{step}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Deep details (collapsed) — scores moved out, this is now just extras       */
/* -------------------------------------------------------------------------- */

function DeepDetails({
  analysis,
  allFlags,
  focusFlagId,
}: {
  analysis: AnalysisResult;
  allFlags: PlainFlag[];
  focusFlagId: string | null;
}) {
  const extras = allFlags.length > 3 ? allFlags.slice(3) : [];
  const hasConsistency = !!analysis.consistencyAnalysis?.summary;
  const shouldOpenForFocus = !!focusFlagId && extras.some((f) => f.id === focusFlagId);
  const [open, setOpen] = useState(shouldOpenForFocus);

  if (extras.length === 0 && !hasConsistency) return null;

  return (
    <section>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-2xl bg-white ring-1 ring-stone-200 px-5 py-4 hover:bg-stone-50 transition-colors"
      >
        <div className="text-left">
          <h2 className="text-base font-semibold text-slate-900">More details</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {extras.length > 0
              ? `${extras.length} more signal${extras.length === 1 ? '' : 's'}${
                  hasConsistency ? ' and consistency notes' : ''
                }`
              : 'Consistency notes from the conversation.'}
          </p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-5">
              {extras.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
                    Everything else we noticed
                  </h3>
                  <ul className="space-y-3">
                    {extras.map((f) => (
                      <FlagCard key={f.id} flag={f} defaultOpen={f.id === focusFlagId} />
                    ))}
                  </ul>
                </div>
              )}

              {hasConsistency && (
                <div className="rounded-2xl bg-white ring-1 ring-stone-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">
                    Consistency
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {analysis.consistencyAnalysis!.summary}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Safety reminders                                                          */
/* -------------------------------------------------------------------------- */

function SafetyReminders({ verdictLevel }: { verdictLevel: VerdictMeta['level'] }) {
  const isUrgent = verdictLevel === 'danger' || verdictLevel === 'concerning';

  const tips = isUrgent
    ? [
        {
          icon: Ban,
          text: "Never send money, gift cards, or financial details — no matter the story.",
        },
        {
          icon: EyeOff,
          text: "Don't share intimate photos. Once sent, you lose control of them.",
        },
        {
          icon: Users,
          text: 'Tell someone you trust about this conversation.',
        },
      ]
    : [
        { icon: Video, text: 'Video chat before meeting in person — even just for a minute.' },
        { icon: Eye, text: "Reverse-image-search their profile photos." },
        { icon: Users, text: 'Tell a friend your plans and check in afterwards.' },
      ];

  return (
    <Section title={isUrgent ? "Don't cross these lines" : 'Quick safety reminders'}>
      <ul
        className={`rounded-2xl ${
          isUrgent ? 'bg-red-50 ring-red-200' : 'bg-indigo-50 ring-indigo-200'
        } ring-1 p-5 space-y-3`}
      >
        {tips.map((tip) => (
          <li key={tip.text} className="flex items-start gap-3 text-sm leading-relaxed">
            <div
              className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                isUrgent ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              <tip.icon className="w-3.5 h-3.5" />
            </div>
            <span className={isUrgent ? 'text-red-950' : 'text-indigo-950'}>{tip.text}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Share sheet                                                               */
/* -------------------------------------------------------------------------- */

function ShareSheet({
  onClose,
  onCopy,
  onShare,
  onPrint,
  summary,
}: {
  onClose: () => void;
  onCopy: () => void;
  onShare: () => void;
  onPrint: () => void;
  summary: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-10 h-1 bg-stone-300 rounded-full sm:hidden mb-4" />
        <h3 className="text-lg font-semibold text-slate-900">Share your full analysis</h3>
        <p className="text-sm text-slate-600 mt-1">
          The complete report — verdict, scores, every flag with what it means and what to do.
          Note: this includes quotes from the conversation.
        </p>

        <pre className="mt-4 max-h-40 overflow-y-auto rounded-2xl bg-stone-50 ring-1 ring-stone-200 p-3 text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
          {summary}
        </pre>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <ActionButton onClick={onShare} icon={Share2} label="Share" />
          <ActionButton onClick={onCopy} icon={Copy} label="Copy" />
          <ActionButton onClick={onPrint} icon={Printer} label="Print" />
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full rounded-full py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}

function ActionButton({
  onClick,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-stone-50 ring-1 ring-stone-200 hover:bg-stone-100 transition-colors py-3"
    >
      <Icon className="w-5 h-5 text-slate-700" />
      <span className="text-xs font-medium text-slate-700">{label}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Footer() {
  return (
    <p className="text-xs text-slate-400 text-center pt-2">
      Swipe Safe gives you a second opinion. Trust your gut — and tell someone if you need help.
    </p>
  );
}

function lowerFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function buildFullReport(
  verdict: VerdictMeta,
  analysis: AnalysisResult,
  allFlags: PlainFlag[],
  nextSteps: string[]
): string {
  const lines: string[] = [];
  const L = (s = '') => lines.push(s);
  const RULE = '----------------------------------------';

  L('SWIPE SAFE — FULL ANALYSIS');
  L('========================================');
  L(`Verdict: ${verdict.title}`);
  L(verdict.oneLine);
  try {
    const d =
      analysis.createdAt instanceof Date ? analysis.createdAt : new Date(analysis.createdAt);
    if (!isNaN(d.getTime())) L(`Analyzed: ${d.toLocaleString()}`);
  } catch {
    /* no date */
  }
  L();

  const red = allFlags.filter((f) => f.type === 'red').length;
  const green = allFlags.filter((f) => f.type === 'green').length;
  L('SCORES');
  L(RULE);
  L(`Risk:     ${analysis.riskScore ?? 0}/100  (how worrying it looks)`);
  L(`Trust:    ${analysis.trustScore ?? 0}/100  (positive signals)`);
  L(`Pressure: ${analysis.escalationIndex ?? 0}/100  (how fast things move)`);
  L(`Flags:    ${red} red, ${green} green`);
  L();

  if (allFlags.length > 0) {
    L('WHAT WE NOTICED');
    L(RULE);
    allFlags.forEach((flag, i) => {
      const f = flag.raw;
      const tag =
        flag.type === 'green'
          ? 'GREEN FLAG'
          : `RED FLAG${flag.severity ? ` · ${flag.severity.toUpperCase()}` : ''}`;
      L(`${i + 1}. [${tag}] ${flag.title}`);
      if (flag.oneLine) L(`   ${flag.oneLine}`);
      if (f.evidence) L(`   Their words: "${f.evidence}"`);
      if (f.meaning) L(`   The pattern: ${f.meaning}`);
      if (f.psychologicalInsight) L(`   What it likely means: ${f.psychologicalInsight}`);
      if (f.whatToDo) L(`   What to do: ${f.whatToDo}`);
      if (f.aiSuggestedReply?.content) L(`   Suggested reply: "${f.aiSuggestedReply.content}"`);
      if (f.exitStrategy) L(`   If you want to step away: ${f.exitStrategy}`);
      L();
    });
  }

  if (nextSteps.length > 0) {
    L('WHAT TO DO NEXT');
    L(RULE);
    nextSteps.forEach((s, i) => L(`${i + 1}. ${s}`));
    L();
  }

  if (analysis.consistencyAnalysis?.summary) {
    L('CONSISTENCY');
    L(RULE);
    L(analysis.consistencyAnalysis.summary);
    L();
  }

  L(RULE);
  L('Generated by Swipe Safe — a second opinion, not a replacement for your instincts.');

  return lines.join('\n');
}
