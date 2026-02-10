/**
 * Formats an SSG API date integer (YYYYMMDD) to a readable string.
 * e.g. 20191022 → "22 Oct 2019"
 */
export function formatDate(dateInt: number | undefined | null): string {
  if (!dateInt) return '-';
  const str = String(dateInt);
  if (str.length !== 8) return str;
  const year = str.slice(0, 4);
  const month = parseInt(str.slice(4, 6), 10) - 1;
  const day = str.slice(6, 8);
  const date = new Date(parseInt(year), month, parseInt(day));
  return date.toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
