'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/context/auth-context';

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    router.replace(user ? '/applications' : '/login');
  }, [user, isLoading, router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-zinc-500">Loading…</p>
    </div>
  );
}
