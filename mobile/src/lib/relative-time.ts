// "just now", "15 min ago", "3 h ago", then a date -- for short-lived reports
// (incidents expire within hours) where exact timestamps add little.
export function relativeTime(iso: string, now: number = Date.now()): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString();
}
