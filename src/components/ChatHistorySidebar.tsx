'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  MessageCircle,
  ShieldCheck,
  Settings,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { User } from '@supabase/supabase-js';

interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
}

interface Profile {
  full_name: string | null;
  username: string | null;
  subscription: string | null;
  subscription_current_period_end: string | null;
}

export default function ChatHistorySidebar() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();

  const displayName = (() => {
    if (profile?.full_name?.trim()) return profile.full_name.trim();
    if (profile?.username?.trim()) return profile.username.trim();
    if (user?.email) return user.email;
    return 'Account';
  })();

  const initials = (() => {
    const source = profile?.full_name?.trim() || user?.email || '';
    if (!source) return '··';
    if (profile?.full_name) {
      const parts = source.split(/\s+/).filter(Boolean);
      const first = parts[0]?.[0] || '';
      const second = parts[1]?.[0] || parts[0]?.[1] || '';
      return (first + second).toUpperCase();
    }
    const namePart = source.split('@')[0] || '';
    return (namePart[0] || '') + (namePart[1] || '').toUpperCase();
  })();

  const isPremium = profile?.subscription === 'premium';

  // Friendly renewal/plan line shown under the user's name.
  const planLine = (() => {
    if (!isPremium) return 'Free plan · Settings';
    const end = profile?.subscription_current_period_end;
    if (end) {
      const d = new Date(end);
      if (!isNaN(d.getTime())) return `Premium · renews ${format(d, 'MMM d, yyyy')}`;
    }
    return 'Premium plan';
  })();

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setUser(user);
      if (!user) {
        setLoading(false);
        return;
      }

      const [sessionsRes, profileRes] = await Promise.all([
        supabase
          .from('chat_sessions')
          .select('id, title, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('full_name, username, subscription, subscription_current_period_end')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      if (sessionsRes.error) {
        toast.error('Could not fetch chat history.');
        console.error(sessionsRes.error);
      } else {
        setSessions(sessionsRes.data || []);
      }
      if (profileRes.data) {
        setProfile(profileRes.data);
      }
      setLoading(false);
    };

    fetchAll();

    const onRenamed = () => fetchAll();
    window.addEventListener('chat-session-renamed', onRenamed);

    return () => {
      cancelled = true;
      window.removeEventListener('chat-session-renamed', onRenamed);
    };
  }, [supabase]);

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const originalSessions = sessions;
    setSessions(sessions.filter((s) => s.id !== sessionId));

    const response = await fetch(`/api/chat/sessions/${sessionId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      toast.error('Failed to delete session.');
      setSessions(originalSessions);
    } else {
      toast.success('Chat deleted.');
      if (pathname.includes(sessionId)) {
        router.push('/dashboard/chat/new');
      }
    }
  };

  const handleNewChat = () => {
    router.push('/dashboard/chat/new');
  };

  return (
    <div className="bg-stone-50 border-r border-stone-200/70 h-full flex flex-col w-64">
      {/* Brand mark */}
      <div className="px-4 py-4 flex items-center gap-2.5 border-b border-stone-200/70">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-sm shadow-indigo-500/20">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <span className="text-base font-semibold tracking-tight text-slate-900">
          Swipe Safe
        </span>
      </div>

      {/* New chat CTA */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={handleNewChat}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 transition-colors shadow-sm shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          New chat
        </button>
      </div>

      {/* Sessions */}
      <div className="px-3 pt-3 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 px-1.5 mb-1.5">
          Recent
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <div className="px-3 py-2 space-y-2">
            <div className="h-9 rounded-xl bg-stone-100 animate-pulse" />
            <div className="h-9 rounded-xl bg-stone-100 animate-pulse" />
            <div className="h-9 rounded-xl bg-stone-100 animate-pulse" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-3 py-2 text-xs text-slate-500 leading-relaxed">
            Your past chats will show up here.
          </p>
        ) : (
          <ul className="space-y-1">
            {sessions.map((session) => {
              const isActive = pathname.includes(session.id);
              return (
                <li key={session.id}>
                  <Link
                    href={`/dashboard/chat/${session.id}`}
                    className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                      isActive
                        ? 'bg-white ring-1 ring-indigo-200 text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-1 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-indigo-500" />
                    )}
                    <MessageCircle
                      className={`w-3.5 h-3.5 flex-shrink-0 ${
                        isActive ? 'text-indigo-600' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate flex-1" title={session.title}>
                      {session.title || 'Untitled chat'}
                    </span>
                    <button
                      onClick={(e) => handleDelete(session.id, e)}
                      className="p-1 rounded-md hover:bg-rose-100 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* User pill → Profile & Settings */}
      {user && (
        <div className="p-3 border-t border-stone-200/70">
          <Link
            href="/dashboard/profile"
            aria-label="Profile & settings"
            className="group flex items-center gap-3 rounded-2xl ring-1 ring-stone-200 bg-white p-2.5 hover:bg-stone-50 transition-colors"
          >
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 flex items-center justify-center font-semibold text-xs">
                {initials}
              </div>
              {isPremium && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-indigo-600 ring-2 ring-white flex items-center justify-center"
                  title="Premium"
                >
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
              <p className="text-[11px] text-slate-500 truncate">{planLine}</p>
            </div>
            <Settings className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" />
          </Link>
        </div>
      )}
    </div>
  );
}
