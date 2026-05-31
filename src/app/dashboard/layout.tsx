'use client';

import { useState, useEffect } from 'react';
import ChatHistorySidebar from '@/components/ChatHistorySidebar';
import { Menu, ShieldCheck } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="relative flex h-screen bg-stone-100 overflow-hidden">
      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-shrink-0">
        <ChatHistorySidebar />
      </div>

      {/* Mobile sidebar with overlay */}
      <div className={`fixed inset-0 flex z-40 md:hidden transition-transform transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="w-64">
          <ChatHistorySidebar />
        </div>
        <div
          className="flex-1 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden bg-white/85 backdrop-blur border-b border-stone-200/70 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-stone-100 transition-colors"
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 flex justify-center items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-base font-semibold tracking-tight text-slate-900">Swipe Safe</h1>
          </div>
          <div className="w-9" aria-hidden />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}