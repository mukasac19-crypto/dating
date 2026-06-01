'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

/**
 * Shared chrome (header + footer) and typographic styling for the static
 * legal pages (Privacy Policy, Terms of Service). Matches the landing-page
 * aesthetic: stone-50 surface, slate-900 ink, indigo accents.
 */
export default function LegalPage({
  title,
  lastUpdated,
  intro,
  children,
}: {
  title: string;
  lastUpdated: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 antialiased selection:bg-indigo-200/60">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-stone-50/80 backdrop-blur-md border-b border-stone-200/70">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <nav className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold tracking-tight">Swipe Safe</span>
            </Link>
            <div className="flex items-center gap-6 text-sm font-medium text-slate-600">
              <Link href="/privacy" className="hover:text-slate-900 transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-slate-900 transition-colors">
                Terms
              </Link>
              <Link href="/about" className="hover:text-slate-900 transition-colors">
                About
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 lg:px-8 py-16 sm:py-20">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-3 text-sm text-slate-500">Last updated: {lastUpdated}</p>
        {intro && (
          <p className="mt-6 text-base sm:text-lg leading-relaxed text-slate-600">{intro}</p>
        )}

        <div
          className="
            mt-10 space-y-10
            [&_h2]:text-xl [&_h2]:sm:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-slate-900
            [&_h2]:mb-3
            [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900 [&_h3]:mt-5 [&_h3]:mb-2
            [&_p]:text-slate-600 [&_p]:leading-relaxed [&_p]:mt-3
            [&_ul]:mt-3 [&_ul]:space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-slate-600 [&_ul]:leading-relaxed
            [&_li]:marker:text-indigo-400
            [&_a]:text-indigo-600 [&_a]:font-medium [&_a:hover]:text-indigo-700 [&_a]:underline [&_a]:underline-offset-2
            [&_strong]:text-slate-900 [&_strong]:font-semibold
          "
        >
          {children}
        </div>
      </main>

      {/* Footer */}
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
              <Link href="/about" className="hover:text-slate-900 transition-colors">About</Link>
              <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
              <Link href="/login" className="hover:text-slate-900 transition-colors">Sign in</Link>
            </nav>
          </div>
          <p className="mt-8 text-xs text-slate-500">
            © {new Date().getFullYear()} Swipe Safe. A second opinion — not a replacement for your instincts.
          </p>
        </div>
      </footer>
    </div>
  );
}
