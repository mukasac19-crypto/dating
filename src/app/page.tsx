'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Check,
  AlertTriangle,
  Lock,
  Eye,
  ChevronDown,
  Heart,
  MessageCircle,
  Clock,
  Zap,
  Star,
} from 'lucide-react';
import UpgradeButton from '@/components/UpgradeButton';
import Logo from '@/components/Logo';
import { PREMIUM_PLAN, FREE_PLAN } from '@/lib/plan';

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

const personas = [
  {
    icon: Heart,
    title: 'Met someone but something feels off',
    body: "You can't put your finger on it. We'll spot the pattern.",
    tint: 'from-rose-50 to-white ring-rose-100',
    iconTint: 'bg-rose-100 text-rose-700',
  },
  {
    icon: Clock,
    title: 'Things are moving really fast',
    body: '"I love you" after three days? We\'ll tell you if it\'s love bombing.',
    tint: 'from-amber-50 to-white ring-amber-100',
    iconTint: 'bg-amber-100 text-amber-700',
  },
  {
    icon: Eye,
    title: 'Long-distance match getting personal',
    body: 'Asking weird questions about money or your address? Send us the chat.',
    tint: 'from-indigo-50 to-white ring-indigo-100',
    iconTint: 'bg-indigo-100 text-indigo-700',
  },
];

const benefits = [
  {
    icon: AlertTriangle,
    title: 'Catches the things you might miss',
    body: 'Love bombing, gaslighting, financial setup — 28 patterns scanned in seconds.',
  },
  {
    icon: Sparkles,
    title: 'Highlights the good signs too',
    body: 'Not every conversation is a trap. We point out the green flags as much as the red.',
  },
  {
    icon: MessageCircle,
    title: 'Tells you exactly what to do',
    body: 'A plain-English verdict, the top 3 things to know, and a suggested reply you can copy.',
  },
];

const steps = [
  {
    n: '01',
    title: 'Paste or upload',
    body: 'Drop in a chat from Tinder, Bumble, Hinge, WhatsApp — anywhere. Or upload a screenshot.',
  },
  {
    n: '02',
    title: 'AI reads every line',
    body: 'It looks for manipulation tactics, inconsistencies, financial setups, and emotional pressure.',
  },
  {
    n: '03',
    title: 'You get a verdict',
    body: 'One clear label. The top 3 things to know. What to do next. Under a minute.',
  },
];

const faqs = [
  {
    q: "Is it really free?",
    a: "Yes — your first analysis is free, no card and no signup needed. Sign in if you want to save your history. Premium unlocks unlimited analyses.",
  },
  {
    q: 'Are my messages stored?',
    a: "No. The chat is processed for the analysis and then thrown out. We don't keep your conversations on our servers.",
  },
  {
    q: 'How accurate is it?',
    a: "Very — for known manipulation patterns. Use it as a strong second opinion, not as a replacement for your own gut. If something feels wrong, it usually is.",
  },
  {
    q: 'Which apps does it work with?',
    a: 'Any app you can screenshot or copy text from: Tinder, Bumble, Hinge, Instagram DMs, WhatsApp, iMessage, Telegram, Snapchat, and more.',
  },
  {
    q: 'Will the other person know?',
    a: 'No. Nothing happens on the dating app itself. The analysis is entirely on your side.',
  },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 antialiased selection:bg-indigo-200/60">
      <Header />
      <main>
        <Hero />
        <PlatformStrip />
        <Benefits />
        <HowItWorks />
        <Personas />
        <Testimonials />
        <Pricing />
        <Privacy />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Header                                                                    */
/* -------------------------------------------------------------------------- */

function Header() {
  return (
    <header className="sticky top-0 z-50 bg-stone-50/80 backdrop-blur-md border-b border-stone-200/70">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <nav className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center">
            <Logo className="h-16 w-auto" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              How it works
            </a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Pricing
            </a>
            <a href="#privacy" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Privacy
            </a>
            <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              FAQ
            </a>
            <Link href="/about" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              About
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-block text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard/chat/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
            >
              Try free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero                                                                      */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft, warm background glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/3 w-[40rem] h-[40rem] rounded-full bg-rose-200/30 blur-3xl" />
        <div className="absolute top-40 -right-32 w-[36rem] h-[36rem] rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute -bottom-40 left-0 w-[28rem] h-[28rem] rounded-full bg-emerald-200/25 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left: copy */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-7"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-stone-200 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Free · No signup · 30 seconds
            </div>

            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-slate-900 leading-[1.05]">
              Is this person really{' '}
              <span className="relative inline-block">
                <span className="relative z-10">who they say</span>
                <span className="absolute inset-x-0 bottom-1 sm:bottom-2 h-3 sm:h-4 bg-amber-200/70 -z-0 rounded-sm" />
              </span>{' '}
              they are?
            </h1>

            <p className="mt-6 text-lg sm:text-xl leading-relaxed text-slate-600 max-w-xl">
              Paste a chat from any dating app. Our AI reads it for scams, manipulation, and red flags —
              then tells you, in plain English, what to do next.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboard/chat/new"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
              >
                Analyze a chat
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-base font-semibold text-slate-800 ring-1 ring-stone-200 hover:bg-stone-100 transition-colors"
              >
                See how it works
              </a>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
              <Trust icon={Check} text="Free to start" />
              <Trust icon={Lock} text="Nothing stored" />
              <Trust icon={Zap} text="Verdict in under a minute" />
            </div>
          </motion.div>

          {/* Right: product preview */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-5"
          >
            <ProductPreview />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Trust({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="w-4 h-4 text-emerald-600" />
      {text}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Product preview (built inline, no images)                                 */
/* -------------------------------------------------------------------------- */

function ProductPreview() {
  return (
    <div className="relative">
      {/* Floating accent chips */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-4 -left-4 sm:-left-8 z-20 rounded-full bg-white ring-1 ring-stone-200 shadow-lg px-3 py-1.5 text-xs font-semibold text-emerald-700 flex items-center gap-1.5"
      >
        <Check className="w-3.5 h-3.5" />
        Green flag detected
      </motion.div>
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="absolute -bottom-3 -right-3 sm:-right-6 z-20 rounded-full bg-white ring-1 ring-stone-200 shadow-lg px-3 py-1.5 text-xs font-semibold text-rose-700 flex items-center gap-1.5"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        Wants to move off the app
      </motion.div>

      {/* Phone-like result card */}
      <div className="relative rounded-3xl bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-stone-200/80 overflow-hidden">
        {/* Verdict hero */}
        <div className="bg-amber-50 p-5 sm:p-6 border-b border-amber-100">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
            <span>🟡</span>
            Result
          </div>
          <h3 className="mt-3 text-2xl font-semibold text-amber-950 tracking-tight">
            Take it slow
          </h3>
          <p className="mt-1.5 text-sm text-amber-900/80 leading-relaxed">
            A few things are worth knowing before you go further.
          </p>
        </div>

        {/* Top things */}
        <div className="p-5 sm:p-6 space-y-3 bg-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Top things to know
          </p>

          <MiniFlag
            type="red"
            title="Brought up money"
            sub="Mentioned an investment opportunity in chat 12."
            severity="Worth knowing"
          />
          <MiniFlag
            type="red"
            title="Story keeps changing"
            sub='Said "lives in Boston" then later "just moved to Dubai".'
            severity="Serious"
          />
          <MiniFlag
            type="green"
            title="Offered to video chat"
            sub="Willing to be seen on camera — strong positive sign."
          />

          <div className="!mt-5 flex items-center gap-2 rounded-2xl bg-indigo-50 ring-1 ring-indigo-100 p-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center">
              1
            </span>
            <p className="text-xs text-indigo-950 leading-snug">
              Ask one direct question that tests their consistency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniFlag({
  type,
  title,
  sub,
  severity,
}: {
  type: 'red' | 'green';
  title: string;
  sub: string;
  severity?: string;
}) {
  const Icon = type === 'green' ? Check : AlertTriangle;
  const surface =
    type === 'green'
      ? 'bg-emerald-50 ring-emerald-100'
      : severity === 'Serious'
      ? 'bg-rose-50 ring-rose-100'
      : 'bg-amber-50 ring-amber-100';
  const iconTint =
    type === 'green'
      ? 'bg-emerald-100 text-emerald-700'
      : severity === 'Serious'
      ? 'bg-rose-100 text-rose-700'
      : 'bg-amber-100 text-amber-700';
  const chipTint =
    type === 'green'
      ? 'bg-emerald-100 text-emerald-800'
      : severity === 'Serious'
      ? 'bg-rose-200 text-rose-900'
      : 'bg-amber-100 text-amber-900';

  return (
    <div className={`rounded-2xl ring-1 ${surface} p-3 flex items-start gap-3`}>
      <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${iconTint}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          {severity && (
            <span className={`text-[9px] font-semibold uppercase tracking-wide rounded-full px-1.5 py-0.5 ${chipTint}`}>
              {severity}
            </span>
          )}
          {type === 'green' && (
            <span className={`text-[9px] font-semibold uppercase tracking-wide rounded-full px-1.5 py-0.5 ${chipTint}`}>
              Positive
            </span>
          )}
        </div>
        <p className="text-xs text-slate-600 mt-0.5 leading-snug">{sub}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Platform strip                                                            */
/* -------------------------------------------------------------------------- */

function PlatformStrip() {
  return (
    <section className="py-10 sm:py-14 border-y border-stone-200/70 bg-white/60">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="text-center text-xs sm:text-sm font-medium uppercase tracking-wider text-slate-500">
          Works with every chat you can screenshot
        </p>
        <div className="mt-6 flex justify-center items-center gap-x-8 sm:gap-x-12 flex-wrap gap-y-4">
          <Image src="/images/apps/tinder.png" alt="Tinder" width={90} height={32} className="h-7 sm:h-8 w-auto" />
          <Image src="/images/apps/Bumble.png" alt="Bumble" width={90} height={32} className="h-7 sm:h-8 w-auto" />
          <Image src="/images/apps/hinge.png" alt="Hinge" width={90} height={28} className="h-6 sm:h-7 w-auto" />
          <Image src="/images/apps/Whatsapp.png" alt="WhatsApp" width={90} height={32} className="h-7 sm:h-8 w-auto" />
          <Image src="/images/apps/imessage.png" alt="iMessage" width={90} height={28} className="h-6 sm:h-7 w-auto" />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Benefits                                                                  */
/* -------------------------------------------------------------------------- */

function Benefits() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader
          eyebrow="What you get"
          title="A second opinion, in plain English."
          subtitle="No clinical jargon. No 20-page report. Just the things that matter — and what to do about them."
        />

        <div className="mt-12 sm:mt-16 grid md:grid-cols-3 gap-5">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-3xl bg-white ring-1 ring-stone-200 p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <b.icon className="w-5 h-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{b.title}</h3>
              <p className="mt-2 text-slate-600 leading-relaxed">{b.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  How it works                                                              */
/* -------------------------------------------------------------------------- */

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-white border-y border-stone-200/70">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader
          eyebrow="How it works"
          title="Three steps. Under a minute."
        />

        <div className="mt-12 sm:mt-16 grid md:grid-cols-3 gap-5">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="relative rounded-3xl bg-gradient-to-br from-stone-50 to-white ring-1 ring-stone-200 p-6 sm:p-7"
            >
              <div className="text-6xl font-semibold tracking-tight text-stone-200 leading-none">{s.n}</div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-slate-600 leading-relaxed">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Personas                                                                  */
/* -------------------------------------------------------------------------- */

function Personas() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader
          eyebrow="Sound familiar?"
          title="You're not paranoid. You're being careful."
          subtitle="The stories we hear from users have a few things in common."
        />

        <div className="mt-12 sm:mt-16 grid md:grid-cols-3 gap-5">
          {personas.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={`rounded-3xl bg-gradient-to-br ${p.tint} ring-1 p-6 sm:p-7`}
            >
              <div className={`w-11 h-11 rounded-2xl ${p.iconTint} flex items-center justify-center`}>
                <p.icon className="w-5 h-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{p.title}</h3>
              <p className="mt-2 text-slate-700 leading-relaxed">{p.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Testimonials                                                              */
/* -------------------------------------------------------------------------- */

const testimonials = [
  {
    quote:
      "I almost sent money to someone who seemed perfect. Swipe Safe flagged the inconsistencies in his story before I did anything I'd regret.",
    name: 'Mara',
    detail: 'Matched on Hinge',
  },
  {
    quote:
      'It caught the love-bombing I was completely falling for. The “take it slow” verdict was the wake-up call I needed.',
    name: 'Daniel',
    detail: 'Matched on Tinder',
  },
  {
    quote:
      'I pasted a week of messages and it showed me exactly where he kept dodging real questions. Eerily accurate.',
    name: 'Aisha',
    detail: 'Matched on Bumble',
  },
  {
    quote:
      'The suggested replies are gold. I knew something felt off — this told me why, in plain English.',
    name: 'Chris',
    detail: 'WhatsApp chat',
  },
];

function Testimonials() {
  // Duplicate the list so the marquee can loop seamlessly (animate to -50%).
  const row = [...testimonials, ...testimonials];
  return (
    <section className="py-20 sm:py-28 bg-white border-y border-stone-200/70 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader
          eyebrow="Real stories"
          title="People date with more confidence."
          subtitle="What users tell us after running their first analysis."
        />
      </div>

      <div className="mt-12 sm:mt-16 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <motion.div
          className="flex gap-5 w-max px-3"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 32, ease: 'linear', repeat: Infinity }}
        >
          {row.map((t, i) => (
            <TestimonialCard key={i} {...t} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function TestimonialCard({
  quote,
  name,
  detail,
}: {
  quote: string;
  name: string;
  detail: string;
}) {
  return (
    <figure className="w-[300px] sm:w-[360px] flex-shrink-0 rounded-3xl bg-stone-50 ring-1 ring-stone-200 p-6 shadow-sm">
      <div className="flex gap-0.5 text-amber-400">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-current" />
        ))}
      </div>
      <blockquote className="mt-4 text-slate-700 leading-relaxed">“{quote}”</blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm">
          {name.charAt(0)}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900">{name}</div>
          <div className="text-xs text-slate-500">{detail}</div>
        </div>
      </figcaption>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pricing                                                                   */
/* -------------------------------------------------------------------------- */

function Pricing() {
  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader
          eyebrow="Pricing"
          title="One simple plan. Everything unlocked."
          subtitle="Start free and see the verdict. Go Premium to read the full breakdown — and use every feature without limits."
        />

        <div className="mt-12 sm:mt-16 grid md:grid-cols-2 gap-5 max-w-4xl mx-auto items-start">
          {/* Free */}
          <div className="rounded-3xl bg-white ring-1 ring-stone-200 p-7 sm:p-8 shadow-sm">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">{FREE_PLAN.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{FREE_PLAN.tagline}</p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight text-slate-900">
                {FREE_PLAN.priceLabel}
              </span>
            </div>
            <ul className="mt-6 space-y-3">
              {FREE_PLAN.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/dashboard/chat/new"
              className="mt-7 w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-white ring-1 ring-stone-300 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-stone-100 transition-colors"
            >
              Start free
            </Link>
          </div>

          {/* Premium */}
          <div className="relative rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-7 sm:p-8 text-white shadow-xl shadow-indigo-900/20">
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-rose-400/20 blur-3xl" />
              <div className="absolute -bottom-20 -left-16 w-52 h-52 rounded-full bg-emerald-400/20 blur-3xl" />
            </div>
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold tracking-tight">{PREMIUM_PLAN.name}</h3>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 ring-1 ring-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-50">
                  <Sparkles className="w-3 h-3" />
                  Unlimited
                </span>
              </div>
              <p className="mt-1 text-sm text-indigo-100">{PREMIUM_PLAN.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">{PREMIUM_PLAN.priceLabel}</span>
                <span className="text-indigo-200">{PREMIUM_PLAN.intervalLabel}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {PREMIUM_PLAN.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-indigo-50">
                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-white/15 flex items-center justify-center">
                      <Check className="w-3 h-3 text-emerald-300" />
                    </span>
                    <span className="leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
              <UpgradeButton className="group mt-7 w-full inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-stone-100 transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Get Premium
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </UpgradeButton>
              <p className="mt-3 text-xs text-indigo-200/80 text-center">
                {PREMIUM_PLAN.blurb} Secure checkout by Stripe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Privacy                                                                   */
/* -------------------------------------------------------------------------- */

function Privacy() {
  return (
    <section id="privacy" className="py-20 sm:py-28 bg-slate-900 text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] rounded-full bg-emerald-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/20 px-3 py-1 text-xs font-medium uppercase tracking-wider text-emerald-300">
          <Lock className="w-3.5 h-3.5" />
          Privacy by default
        </div>
        <h2 className="mt-5 text-3xl sm:text-5xl font-semibold tracking-tight">
          Your chats stay yours.
        </h2>
        <p className="mt-5 text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          We built this for moments when you feel vulnerable. The last thing you need is to wonder
          where your messages went.
        </p>

        <div className="mt-12 grid sm:grid-cols-3 gap-4">
          <PrivacyPoint
            title="Nothing stored"
            body="Conversations are processed for analysis, then thrown out."
          />
          <PrivacyPoint
            title="Yours alone"
            body="The other person doesn't see anything. Nothing happens on the dating app."
          />
          <PrivacyPoint
            title="Never sold"
            body="We don't sell or share your data. Ever."
          />
        </div>
      </div>
    </section>
  );
}

function PrivacyPoint({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 text-left backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Check className="w-5 h-5 text-emerald-400" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-slate-300 leading-relaxed">{body}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  FAQ                                                                       */
/* -------------------------------------------------------------------------- */

function Faq() {
  return (
    <section id="faq" className="py-20 sm:py-28 bg-white border-y border-stone-200/70">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <SectionHeader eyebrow="FAQ" title="The things people ask." />

        <div className="mt-10 divide-y divide-stone-200">
          {faqs.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-6 text-left group"
      >
        <h3 className="text-base sm:text-lg font-medium text-slate-900 group-hover:text-indigo-700 transition-colors">
          {q}
        </h3>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 text-slate-400"
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
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pt-3 text-slate-600 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Final CTA                                                                 */
/* -------------------------------------------------------------------------- */

function FinalCta() {
  return (
    <section className="py-20 sm:py-32">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-8 sm:p-14 text-center shadow-2xl shadow-indigo-900/20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-rose-400/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-emerald-400/20 blur-3xl" />
          </div>

          <div className="relative">
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white">
              Date with more clarity.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-indigo-100 max-w-xl mx-auto leading-relaxed">
              Try your first analysis free. No card, no signup, no catch.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard/chat/new"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-base font-semibold text-slate-900 hover:bg-stone-100 transition-colors shadow-lg"
              >
                Analyze a chat
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 ring-1 ring-white/30 px-6 py-3.5 text-base font-semibold text-white hover:bg-white/15 transition-colors backdrop-blur-sm"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Footer                                                                    */
/* -------------------------------------------------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-stone-200/70 bg-stone-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight">Swipe Safe</span>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#privacy" className="hover:text-slate-900 transition-colors">Privacy</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
            <Link href="/about" className="hover:text-slate-900 transition-colors">About</Link>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy policy</Link>
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
            <Link href="/login" className="hover:text-slate-900 transition-colors">Sign in</Link>
          </nav>
        </div>
        <p className="mt-8 text-xs text-slate-500">
          © {new Date().getFullYear()} Swipe Safe. A second opinion — not a replacement for your instincts.
        </p>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared section header                                                     */
/* -------------------------------------------------------------------------- */

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
