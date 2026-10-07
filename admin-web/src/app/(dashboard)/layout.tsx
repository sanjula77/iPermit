'use client';

import { Activity, BadgeCheck, FileText, LogOut, Scale, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { useAuth } from '@/context/auth-context';
import * as appealsApi from '@/lib/appeals-api';
import * as applicationsApi from '@/lib/applications-api';

type NavItem = { href: string; label: string; icon: LucideIcon; countKey?: 'applications' | 'appeals' };

const NAV_LINKS: NavItem[] = [
  { href: '/applications', label: 'Applications', icon: FileText, countKey: 'applications' },
  { href: '/appeals', label: 'Appeals', icon: Scale, countKey: 'appeals' },
  { href: '/badges', label: 'Badges', icon: BadgeCheck },
  { href: '/behaviour', label: 'Behaviour', icon: Activity },
];

// Pending work for the sidebar badges, refreshed on every page change so the
// numbers follow an approval or resolution made on that page.
function usePendingCounts(pathname: string, enabled: boolean) {
  const [counts, setCounts] = useState<{ applications: number; appeals: number } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    Promise.all([applicationsApi.listApplications('PENDING'), appealsApi.listAppeals('PENDING')])
      .then(([applications, appeals]) => {
        if (!cancelled) setCounts({ applications: applications.length, appeals: appeals.length });
      })
      .catch(() => {
        // Badges are a courtesy; the pages show their own errors.
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, enabled]);
  return counts;
}

export default function DashboardLayout({ children }: PropsWithChildren) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const counts = usePendingCounts(pathname, !!user);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-brand" aria-label="Loading" />
      </div>
    );
  }

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col bg-gradient-to-b from-brand-deep to-brand text-white lg:sticky lg:top-0 lg:h-screen lg:w-64">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <p className="text-lg font-bold leading-tight">iPermit</p>
            <p className="text-xs text-white/70">Licensing admin</p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {NAV_LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            const count = link.countKey && counts ? counts[link.countKey] : 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                data-testid={`nav-${link.label.toLowerCase()}`}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-white text-brand-deep shadow-card' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <link.icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="flex-1 whitespace-nowrap">{link.label}</span>
                {count > 0 ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                      active ? 'bg-brand text-white' : 'bg-amber-400 text-amber-950'
                    }`}
                    aria-label={`${count} pending`}
                  >
                    {count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-white/10 p-4 lg:block">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" data-testid="dashboard-admin-email">
                {user.email}
              </p>
              <p className="text-xs text-white/60">Administrator</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            data-testid="logout-button"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 sm:p-8">
        <div className="mx-auto max-w-6xl space-y-6">{children}</div>
        {/* Small screens: the sidebar's account block is hidden, so log out lives here. */}
        <button
          type="button"
          onClick={handleLogout}
          className="mx-auto mt-8 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 lg:hidden"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Log out ({user.email})
        </button>
      </main>
    </div>
  );
}
