'use client';

import { CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { extractErrorMessage } from '@/lib/api-client';

const HIGHLIGHTS = [
  'Review licence applications and issue digital licences',
  'Decide fine appeals and restore points',
  'Monitor driver safety badges',
];

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/applications');
    }
  }, [user, isLoading, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(identifier.trim(), password);
      router.replace('/applications');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1">
      {/* Brand panel (large screens). */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-deep via-brand to-brand-bright p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" aria-hidden />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5" aria-hidden />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </div>
          <span className="text-xl font-bold">iPermit</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight">Licensing administration</h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-white/90">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/60">Digital driving licence and traffic enforcement platform</p>
      </div>

      {/* Form. */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
          <div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white lg:hidden">
              <ShieldCheck className="h-7 w-7" aria-hidden />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Welcome back</h1>
            <p className="mt-2 text-sm text-gray-500">Sign in with your administrator account.</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                id="identifier"
                aria-label="Email or NIC"
                data-testid="login-identifier"
                type="text"
                autoComplete="username"
                placeholder="Email or NIC"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-3 text-sm shadow-card focus:border-brand focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                id="password"
                aria-label="Password"
                data-testid="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-12 text-sm shadow-card focus:border-brand focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error ? (
            <Alert tone="red" testId="login-error">
              {error}
            </Alert>
          ) : null}

          <button
            type="submit"
            data-testid="login-submit"
            disabled={isSubmitting || !identifier.trim() || !password}
            className="h-12 w-full rounded-xl bg-brand text-sm font-semibold text-white shadow-raised transition hover:bg-brand-deep active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-center text-xs text-gray-400">Only administrator accounts can sign in here.</p>
        </form>
      </div>
    </div>
  );
}
