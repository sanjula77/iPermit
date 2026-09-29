// Dates and amounts read the same on every phone. toLocaleDateString() follows
// the device locale, and a US-set phone shows "9/26/2026", which is ambiguous
// in Sri Lanka. Dates are shown in the phone's own time zone.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "26 Sep 2026"; "—" for a missing or unparseable timestamp.
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// "26 Sep" for list rows; the year only when it isn't the current one
// ("31 Dec 2025"). "—" for a missing or unparseable timestamp.
export function formatDateShort(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const dayMonth = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? dayMonth : `${dayMonth} ${date.getFullYear()}`;
}

// "LKR 10,000". The no-break space (U+00A0) keeps "LKR" and the number on one
// line, and the grouping is fixed rather than locale-dependent. "—" for a
// missing (non-finite) amount, matching formatDate.
export function formatLkr(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `LKR\u00A0${grouped}`;
}
