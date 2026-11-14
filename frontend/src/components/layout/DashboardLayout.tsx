'use client';

import React from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Bell, ShieldCheck } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#080B11] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground text-sm">Authenticating session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex w-full overflow-x-hidden">
      <Sidebar />

      <div className="flex-1 min-w-0 pl-20 md:pl-64 min-h-screen flex flex-col max-w-full">
        {/* Top Navbar */}
        <header className="h-16 border-b border-border px-4 md:px-8 flex items-center justify-between glass-panel sticky top-0 z-20 w-full">
          <div className="flex items-center gap-3">
            <span className="text-xs md:text-sm font-semibold px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/20 flex items-center gap-1.5">
              <ShieldCheck size={14} /> AI Surveillance Online
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground relative border border-border bg-background/10">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive animate-pulse"></span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 w-full min-w-0 max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
