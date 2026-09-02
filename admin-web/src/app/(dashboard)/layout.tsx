'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { useAuth } from '@/context/auth-context';

export default function DashboardLayout({ children }: PropsWithChildren) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-zinc-900">iPermit Admin</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-500" data-testid="dashboard-admin-email">
            {user.email}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            data-testid="logout-button"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="flex-1 bg-zinc-50 p-6">{children}</main>
    </div>
  );
}
