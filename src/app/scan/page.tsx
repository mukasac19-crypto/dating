'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { ArrowRight, Lock, ImagePlus, ScanLine, X, Check, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/Logo';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics';
import { FREE_MAX_IMAGES } from '@/lib/limits';
import { ONE_TIME_UNLOCK, PREMIUM_PLAN } from '@/lib/plan';

type Staged = { file: File; url: string };

const SCAN_STEPS = [
  'Reading the conversation…',
  'Spotting patterns and tone…',
  'Checking for manipulation signals…',
  'Looking for green flags too…',
  'Writing your verdict…',
];

const PLATFORMS = [
  { src: '/images/apps/tinder.png', alt: 'Tinder', w: 80, h: 28 },
  { src: '/images/apps/Bumble.png', alt: 'Bumble', w: 80, h: 28 },
  { src: '/images/apps/hinge.png', alt: 'Hinge', w: 76, h: 24 },
  { src: '/images/apps/Whatsapp.png', alt: 'WhatsApp', w: 80, h: 28 },
  { src: '/images/apps/imessage.png', alt: 'iMessage', w: 76, h: 24 },
];

export default function ScanPage() {
  const router = useRouter();
  const supabase = createClient();
  const [images, setImages] = useState<Staged[]>([]);
  const [processing, setProcessing] = useState(false);
  const [loadingText, setLoadingText] = useState(SCAN_STEPS[0]);

  // Revoke object URLs on unmount.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(() => () => imagesRef.current.forEach((i) => URL.revokeObjectURL(i.url)), []);

  // Cycle the loader copy while analyzing.
  useEffect(() => {
    if (!processing) return;
    let i = 0;
    setLoadingText(SCAN_STEPS[0]);
    const id = setInterval(() => {
      i = (i + 1) % SCAN_STEPS.length;
      setLoadingText(SCAN_STEPS[i]);
    }, 2500);
    return () => clearInterval(id);
  }, [processing]);

  const addFiles = useCallback((files: File[]) => {
    setImages((prev) => {
      const remaining = FREE_MAX_IMAGES - prev.length;
      if (remaining <= 0) {
        toast.error(`You can add up to ${FREE_MAX_IMAGES} screenshots.`);
        return prev;
      }
      const accepted = files.slice(0, remaining);
      if (files.length > remaining) {
        toast.error(`Added ${remaining} — max ${FREE_MAX_IMAGES} screenshots per scan.`);
      }
      return [...prev, ...accepted.map((file) => ({ file, url: URL.createObjectURL(file) }))];
    });
  }, []);

  // Let users paste a screenshot straight from the clipboard.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (processing) return;
      const files: File[] = [];
      for (const item of Array.from(e.clipboardData?.items ?? [])) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [processing, addFiles]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: addFiles,
    accept: { 'image/*': [] },
    multiple: true,
    noClick: true,
    noKeyboard: true,
    disabled: processing,
  });

  const removeImage = (idx: number) => {
    setImages((prev) => {
      const target = prev[idx];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const analyze = async () => {
    if (images.length === 0 || processing) return;
    setProcessing(true);
    trackEvent(ANALYTICS_EVENTS.SCAN_STARTED, { source: 'scan_landing', image_count: images.length });

    try {
      // Sign the visitor in anonymously in the background — no signup, no nav
      // hop. They become a real (emailless) user so the pipeline + gating work.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) throw new Error('Could not start your scan. Please try again.');
      }

      trackEvent(ANALYTICS_EVENTS.ANALYSIS_STARTED, { method: 'image', image_count: images.length, source: 'scan' });

      const formData = new FormData();
      images.forEach(({ file }) => formData.append('images', file));

      const res = await fetch('/api/ocr/openai', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to analyze the conversation.');
      }
      if (!data?.resultId) {
        throw new Error('Something went wrong saving your analysis. Please try again.');
      }

      images.forEach((i) => URL.revokeObjectURL(i.url));
      // Land on the gated result: verdict free, full breakdown behind the paywall.
      router.push(`/dashboard/analysis/${data.resultId}`);
    } catch (err) {
      toast.error((err as Error).message || 'Something went wrong. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-stone-50 text-slate-900 antialiased selection:bg-indigo-200/60">
      {/* Soft, warm brand glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/4 w-[34rem] h-[34rem] rounded-full bg-rose-200/30 blur-3xl" />
        <div className="absolute top-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute -bottom-40 left-0 w-[24rem] h-[24rem] rounded-full bg-emerald-200/25 blur-3xl" />
      </div>

      <header className="mx-auto max-w-2xl px-6 pt-6 flex items-center justify-between">
        <Logo className="h-14 w-auto" />
        <Link href="/login" className="text-sm font-medium text-slate-500 hover:text-slate-800">
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 pt-8 pb-20 sm:pt-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-stone-200 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Free · No signup · 30 seconds
          </div>

          <h1 className="mt-5 text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
            Is your match{' '}
            <span className="relative inline-block">
              <span className="relative z-10">who they say</span>
              <span className="absolute inset-x-0 bottom-1 h-3 sm:h-4 bg-amber-200/70 -z-0 rounded-sm" />
            </span>{' '}
            they are?
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-md mx-auto">
            Add a screenshot of your chat. Our AI reads it for scams, manipulation,
            and red flags — and tells you what to do next.
          </p>
        </div>

        {/* Upload surface — the hero. */}
        <div className="mt-8">
          {processing ? (
            <div className="rounded-3xl bg-white ring-1 ring-stone-200 shadow-xl shadow-slate-900/5 p-12 flex flex-col items-center justify-center text-center">
              <div className="relative w-16 h-16 mb-5">
                <div className="absolute inset-0 flex items-center justify-center bg-indigo-50 rounded-xl">
                  <ScanLine className="w-8 h-8 text-indigo-400" />
                </div>
                <motion.div
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                />
              </div>
              <h3 className="font-semibold text-slate-900">Analyzing your chat</h3>
              <motion.p
                key={loadingText}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-sm text-indigo-600 font-medium"
              >
                {loadingText}
              </motion.p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              {...(getRootProps() as any)}
              className={`rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-colors shadow-xl shadow-slate-900/5 ${
                isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-stone-300 bg-white'
              }`}
            >
              <input {...getInputProps()} />

              {images.length === 0 ? (
                <button
                  type="button"
                  onClick={open}
                  className="group w-full flex flex-col items-center gap-4 py-2"
                >
                  <span className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 transition-transform group-hover:scale-105">
                    <ImagePlus className="w-8 h-8" />
                  </span>
                  <span className="text-lg font-semibold text-slate-900">
                    Tap to add a screenshot
                  </span>
                  <span className="text-sm text-slate-500">or drag &amp; drop · paste works too</span>
                </button>
              ) : (
                <div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {images.map((img, i) => (
                      <div key={img.url} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={`Screenshot ${i + 1}`}
                          className="w-20 h-20 rounded-xl object-cover ring-1 ring-stone-200"
                        />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shadow"
                          title="Remove"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {images.length < FREE_MAX_IMAGES && (
                      <button
                        type="button"
                        onClick={open}
                        className="w-20 h-20 rounded-xl ring-1 ring-dashed ring-stone-300 text-slate-400 hover:text-indigo-600 hover:ring-indigo-300 flex items-center justify-center transition-colors"
                        title="Add another"
                      >
                        <ImagePlus className="w-6 h-6" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={analyze}
                    className="group mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                  >
                    <ScanLine className="w-5 h-5" />
                    Analyze {images.length} screenshot{images.length === 1 ? '' : 's'}
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Trust row */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-emerald-600" /> Your chat isn&apos;t stored
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" /> They never know
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-emerald-600" /> Verdict in under a minute
          </span>
        </div>

        {/* Platform strip — instant recognition + tells them what to screenshot. */}
        <div className="mt-12">
          <p className="text-center text-xs font-medium uppercase tracking-wider text-slate-400">
            Works with any chat you can screenshot
          </p>
          <div className="mt-5 flex justify-center items-center gap-x-7 sm:gap-x-10 flex-wrap gap-y-3 opacity-80">
            {PLATFORMS.map((p) => (
              <Image
                key={p.alt}
                src={p.src}
                alt={p.alt}
                width={p.w}
                height={p.h}
                className="h-6 sm:h-7 w-auto"
              />
            ))}
          </div>
        </div>

        {/* Low-key disclosure — kept minimal but honest (ad policy + trust brand). */}
        <p className="mt-12 text-center text-xs text-slate-400 leading-relaxed">
          Your verdict is free. Full breakdown from {ONE_TIME_UNLOCK.priceLabel}, or unlimited at{' '}
          {PREMIUM_PLAN.priceLabel}{PREMIUM_PLAN.intervalLabel}. By continuing you agree to our{' '}
          <Link href="/terms" className="underline hover:text-slate-600">Terms</Link> and{' '}
          <Link href="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>.
        </p>
      </main>
    </div>
  );
}
