'use client';

import { useState, useEffect } from 'react';
import ChatHistorySidebar from '@/components/ChatHistorySidebar';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Logo from '@/components/Logo';

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
        <header className="md:hidden bg-white/85 backdrop-blur border-b border-stone-200/70 px-3 py-2.5 flex items-center gap-1.5">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-stone-100 transition-colors"
          >
            <span className="sr-only">Open menu</span>
            <Menu className="h-5 w-5" />
          </button>
          <Logo className="h-12 w-auto" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}