'use client';

import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

// The dashboard's small UI kit (style B): every page composes these instead of
// restyling buttons, tables and badges itself.

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl bg-white shadow-card ${className}`}>{children}</div>;
}

export type Tone = 'brand' | 'amber' | 'green' | 'red' | 'gray' | 'indigo' | 'orange';

const TONE: Record<Tone, { soft: string; text: string; solid: string }> = {
  brand: { soft: 'bg-blue-50', text: 'text-brand', solid: 'bg-brand' },
  amber: { soft: 'bg-amber-50', text: 'text-amber-700', solid: 'bg-amber-500' },
  green: { soft: 'bg-emerald-50', text: 'text-emerald-700', solid: 'bg-emerald-500' },
  red: { soft: 'bg-red-50', text: 'text-red-700', solid: 'bg-red-500' },
  gray: { soft: 'bg-gray-100', text: 'text-gray-700', solid: 'bg-gray-400' },
  indigo: { soft: 'bg-indigo-50', text: 'text-indigo-700', solid: 'bg-indigo-500' },
  orange: { soft: 'bg-orange-50', text: 'text-orange-700', solid: 'bg-orange-500' },
};

export function toneClasses(tone: Tone) {
  return TONE[tone];
}

// A figure tile for the top of a page.
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
  hint,
  testId,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  testId?: string;
}) {
  const t = TONE[tone];
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${t.soft} ${t.text}`}>
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold tabular-nums text-gray-900" data-testid={testId}>
          {value}
        </p>
        {hint ? <p className="truncate text-xs text-gray-400">{hint}</p> : null}
      </div>
    </Card>
  );
}

// Status pill: a coloured dot and a label, never colour alone.
export function StatusPill({ label, tone, testId }: { label: string; tone: Tone; testId?: string }) {
  const t = TONE[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${t.soft} ${t.text}`}
      data-testid={testId}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${t.solid}`} aria-hidden />
      {label}
    </span>
  );
}

// Segmented filter tabs with optional counts.
export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-card" role="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            data-testid={`filter-${option.value}`}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              selected ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {option.label}
            {option.count !== undefined ? (
              <span
                className={`rounded-md px-1.5 text-xs tabular-nums ${selected ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

// Initial-letter avatar for a driver.
export function Avatar({ email }: { email: string }) {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-brand"
      aria-hidden
    >
      {email.charAt(0).toUpperCase()}
    </div>
  );
}

type ButtonVariant = 'primary' | 'success' | 'danger' | 'secondary' | 'ghost';

const BUTTON: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-deep',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  secondary: 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
  ghost: 'text-gray-600 hover:bg-gray-100',
};

export function Button({
  variant = 'primary',
  icon: Icon,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; icon?: LucideIcon }) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${BUTTON[variant]} ${className}`}
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function Alert({ tone, children, testId }: { tone: 'red' | 'green'; children: ReactNode; testId?: string }) {
  return (
    <div
      role="alert"
      data-testid={testId}
      className={`rounded-xl px-4 py-3 text-sm ${tone === 'red' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, testId }: { icon: LucideIcon; title: string; message: string; testId?: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center" data-testid={testId}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-brand">
        <Icon className="h-7 w-7" aria-hidden />
      </div>
      <p className="font-semibold text-gray-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{message}</p>
    </div>
  );
}

// Pulsing placeholder rows while a table loads.
export function TableSkeleton({ rows = 3, testId }: { rows?: number; testId?: string }) {
  return (
    <div className="divide-y divide-gray-100" data-testid={testId}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-4">
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-1/5 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

// A modal dialog (native <dialog>: focus trap and Escape handling built in).
export function Dialog({
  open,
  title,
  onClose,
  size = 'md',
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  size?: 'md' | 'xl';
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={`m-auto w-full rounded-2xl bg-white p-0 shadow-raised backdrop:bg-gray-900/40 ${size === 'xl' ? 'max-w-3xl' : 'max-w-md'}`}
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </dialog>
  );
}
