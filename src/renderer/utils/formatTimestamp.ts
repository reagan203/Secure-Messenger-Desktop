/**
 * Formats a Unix-ms timestamp for display.
 *
 * mode 'short' (default) — chat list:
 *   Today → "14:32", Yesterday → "Yesterday", Older → "Jan 5"
 *
 * mode 'long' — message bubbles:
 *   Today → "14:32", Yesterday → "Yesterday 14:32", Older → "Jan 5 14:32"
 */
export function formatTimestamp(ts: number, mode: 'short' | 'long' = 'short'): string {
  if (ts === 0) return '';
  const date = new Date(ts);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  if (isToday) return time;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return mode === 'short' ? 'Yesterday' : `Yesterday ${time}`;
  }

  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return mode === 'short' ? dateStr : `${dateStr} ${time}`;
}
