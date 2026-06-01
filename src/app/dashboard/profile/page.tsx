'use client';

import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useEffect, useState, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Database } from '@/types/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SignOutButton from '@/components/SignOutButton';
import { Check, Sparkles, Download, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { PREMIUM_PLAN } from '@/lib/plan';

type Profile = Database['public']['Tables']['profiles']['Row'];

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  isBusy,
  title,
  description,
  confirmLabel,
  busyLabel,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isBusy: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busyLabel: string;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-8 shadow-xl max-w-md w-full">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-gray-600 mt-2">{description}</p>
        <div className="mt-6 flex justify-end space-x-4">
          <button onClick={onClose} disabled={isBusy} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isBusy}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isBusy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [confirmKind, setConfirmKind] = useState<null | 'account' | 'data'>(null);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        toast.error('Could not fetch your profile.');
        console.error(error);
      } else {
        setProfile(profileData);
      }
      setLoading(false);

      // Reconcile with Stripe so a paid plan is reflected even if a webhook was
      // missed. Run it when returning from checkout, or for any known customer.
      const justPaid = new URLSearchParams(window.location.search).get('success') === 'true';
      if (justPaid || profileData?.stripe_customer_id) {
        try {
          const res = await fetch('/api/stripe/sync', { method: 'POST' });
          if (res.ok) {
            const { data: fresh } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
            if (fresh) setProfile(fresh);
            // Tell the sidebar to refresh its plan badge.
            window.dispatchEvent(new CustomEvent('subscription-updated'));
            // Invalidate the router cache so already-visited (locked) analysis
            // pages re-render with the new premium status instead of serving a
            // stale cached copy.
            router.refresh();
            if (justPaid && fresh?.subscription === 'premium') {
              toast.success('Welcome to Premium! Your analyses are unlocked.');
            }
          }
        } catch (err) {
          console.warn('Subscription sync failed:', err);
        }
      }
    };
    fetchData();
  }, [supabase, router]);

  const handleUpdateProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdating(true);
    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('fullName') as string;
    const username = formData.get('username') as string;

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, username: username })
      .eq('id', user.id);

    if (error) {
      toast.error(error.message);
    } else {
      setProfile(prev => prev ? { ...prev, full_name: fullName, username } : null);
      toast.success('Profile updated successfully!');
    }
    setIsUpdating(false);
  };

  const handleManageSubscription = async () => {
    setIsRedirectingToStripe(true);
    try {
      const response = await fetch('/api/stripe/manage', { method: 'POST' });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error('Failed to initiate subscription.');
        setIsRedirectingToStripe(false);
      }
    } catch (error) {
      console.error(error);
      toast.error('Something went wrong.');
      setIsRedirectingToStripe(false);
    }
  };

  const handleDownloadData = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/user/export');
      if (!res.ok) throw new Error('Could not export your data.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `swipe-safe-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Your data download has started.');
    } catch (err) {
      toast.error((err as Error).message || 'Something went wrong.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteData = async () => {
    setIsWorking(true);
    try {
      const res = await fetch('/api/user/data', { method: 'DELETE' });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }));
        throw new Error(error || 'Failed to delete your data.');
      }
      toast.success('Your analyses and chat history have been deleted.');
      setConfirmKind(null);
      setProfile(prev => (prev ? { ...prev, analysis_count: 0 } : prev));
      window.dispatchEvent(new CustomEvent('chat-session-renamed'));
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || 'Something went wrong.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsWorking(true);
    try {
      const response = await fetch('/api/user', { method: 'DELETE' });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: null }));
        throw new Error(error || 'Failed to delete account.');
      }
      toast.success('Account deleted successfully.');
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      toast.error((err as Error).message || 'Something went wrong.');
      setIsWorking(false);
      setConfirmKind(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profile) {
    return <div className="p-12 text-center text-red-500">Could not load profile. Please try again later.</div>;
  }

  const renewalDate = (() => {
    const end = profile.subscription_current_period_end;
    if (!end) return null;
    const d = new Date(end);
    return isNaN(d.getTime()) ? null : format(d, 'MMMM d, yyyy');
  })();

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your account, subscription, and data.</p>
        </div>
        <SignOutButton />
      </div>

      {/* Profile Form */}
      <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 mb-8">
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <p className="text-lg text-gray-500 mt-1">{user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                defaultValue={profile?.full_name || ''}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                defaultValue={profile?.username || ''}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50"
              disabled={isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Subscription Section */}
      {profile.subscription === 'premium' ? (
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-800 px-2.5 py-1 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Premium
                </span>
                <span className="text-sm text-gray-500">{PREMIUM_PLAN.priceLabel}{PREMIUM_PLAN.intervalLabel}</span>
              </div>
              <h2 className="mt-3 text-xl font-bold text-gray-900">You&apos;re on Premium</h2>
              <p className="mt-1 text-gray-600">Unlimited access to every feature. Thank you for your support!</p>
              {renewalDate && (
                <p className="mt-2 text-sm text-gray-500">Your plan renews on {renewalDate}.</p>
              )}
            </div>
            <button
              onClick={handleManageSubscription}
              disabled={isRedirectingToStripe}
              className="flex-shrink-0 px-6 py-2.5 bg-gray-800 text-white font-semibold rounded-lg shadow-sm hover:bg-gray-900 disabled:opacity-70"
            >
              {isRedirectingToStripe ? 'Loading...' : 'Manage Subscription'}
            </button>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-8 text-white shadow-lg">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-rose-400/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-16 w-52 h-52 rounded-full bg-emerald-400/20 blur-3xl" />
          </div>
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Upgrade to {PREMIUM_PLAN.name}</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 ring-1 ring-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-50">
                <Sparkles className="w-3 h-3" />
                Unlimited
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight">{PREMIUM_PLAN.priceLabel}</span>
              <span className="text-indigo-200">{PREMIUM_PLAN.intervalLabel}</span>
            </div>
            <p className="mt-1 text-sm text-indigo-100">{PREMIUM_PLAN.tagline} {PREMIUM_PLAN.blurb}</p>

            <ul className="mt-6 grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {PREMIUM_PLAN.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-indigo-50">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-white/15 flex items-center justify-center">
                    <Check className="w-3 h-3 text-emerald-300" />
                  </span>
                  <span className="leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={handleManageSubscription}
              disabled={isRedirectingToStripe}
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-stone-100 transition-colors shadow-lg disabled:opacity-70"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              {isRedirectingToStripe ? 'Loading…' : 'Upgrade for $25/month'}
            </button>
            <p className="mt-3 text-xs text-indigo-200/80">Secure checkout by Stripe. Cancel anytime.</p>
          </div>
        </div>
      )}

      {/* Your data & privacy */}
      <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 mt-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900">Your data &amp; privacy</h2>
        </div>

        <div className="mt-4 space-y-3 text-sm text-gray-600 leading-relaxed">
          <p>
            <strong className="text-gray-900">What we store:</strong> your account details and the
            analysis results you generate (the verdict, flags, and summary). We do{' '}
            <strong className="text-gray-900">not</strong> keep the raw conversations you paste or
            upload — they&apos;re processed to produce your analysis and then discarded.
          </p>
          <p>
            <strong className="text-gray-900">How long we keep it:</strong> your saved analyses and
            account data stay until you delete them or close your account. Submitted conversations
            aren&apos;t retained after the analysis is generated.
          </p>
          <p>
            We never sell your data. Full details are in our{' '}
            <Link href="/privacy" className="text-indigo-600 font-medium hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {/* Download */}
          <div className="rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 text-gray-900 font-semibold">
              <Download className="w-4 h-4 text-indigo-600" />
              Download your data
            </div>
            <p className="mt-1.5 text-sm text-gray-600">
              Get a JSON copy of your account, analyses, and chat history.
            </p>
            <button
              onClick={handleDownloadData}
              disabled={isExporting}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Preparing…' : 'Download (.json)'}
            </button>
          </div>

          {/* Delete data */}
          <div className="rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 text-gray-900 font-semibold">
              <Trash2 className="w-4 h-4 text-amber-600" />
              Delete your data
            </div>
            <p className="mt-1.5 text-sm text-gray-600">
              Permanently erase your analyses and chat history, but keep your account.
            </p>
            <button
              onClick={() => setConfirmKind('data')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete my data
            </button>
          </div>
        </div>
      </div>

      {/* Danger zone — delete account */}
      <div className="bg-white p-8 rounded-lg shadow-md border border-red-500 border-opacity-50 mt-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="text-xl font-bold text-red-700">Delete account</h2>
            </div>
            <p className="mt-1 text-gray-600">Permanently remove your account and all associated data.</p>
          </div>
          <button
            onClick={() => setConfirmKind('account')}
            className="flex-shrink-0 px-6 py-2.5 bg-red-600 text-white font-semibold rounded-lg shadow-sm hover:bg-red-700"
          >
            Delete my account
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmKind === 'data'}
        onClose={() => setConfirmKind(null)}
        onConfirm={handleDeleteData}
        isBusy={isWorking}
        title="Delete your data?"
        description="This permanently erases all of your analyses and chat history. Your account stays active. This can't be undone."
        confirmLabel="Delete my data"
        busyLabel="Deleting…"
      />

      <ConfirmModal
        isOpen={confirmKind === 'account'}
        onClose={() => setConfirmKind(null)}
        onConfirm={handleDeleteAccount}
        isBusy={isWorking}
        title="Delete your account?"
        description="This is irreversible. Your account and all associated data — chat history and analysis results — will be permanently deleted."
        confirmLabel="Delete account"
        busyLabel="Deleting…"
      />
    </div>
  );
}
