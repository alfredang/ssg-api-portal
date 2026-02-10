/**
 * Formats an ISO date string to a readable string.
 * e.g. "2026-02-05T02:50:08Z" → "5 Feb 2026"
 */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return String(dateStr);
  return date.toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
