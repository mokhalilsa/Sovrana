'use client';

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { ToastProvider } from '@/components/Toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-[260px] flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 p-8 bg-slate-50/50">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
