import type { ViolationType } from '@/types/fine';

// Same fixed, locale-independent formats as the mobile app (mobile/src/lib/format.ts).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parse(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

// "26 Sep 2026"
export function formatDate(iso: string): string {
  const date = parse(iso);
  return date ? `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}` : '—';
}

// "2:43 PM"
export function formatTime(iso: string): string {
  const date = parse(iso);
  if (!date) return '';
  const hours = date.getHours() % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes} ${date.getHours() < 12 ? 'AM' : 'PM'}`;
}

// "LKR 10,000", with a no-break space so it never splits.
export function formatLkr(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  return `LKR ${Math.round(amount).toLocaleString('en-US')}`;
}

export const VIOLATION_LABEL: Record<ViolationType, string> = {
  WHITE_LINE: 'Crossing white line',
  SPEEDING: 'Speeding',
  RED_LIGHT: 'Red light',
  DRUNK_DRIVING: 'Drunk driving',
  OTHER: 'Other',
};

// What to call a violation: the officer's own words for an OTHER one.
export function violationTitle(type: ViolationType, description?: string | null): string {
  return type === 'OTHER' && description ? description : VIOLATION_LABEL[type];
}
