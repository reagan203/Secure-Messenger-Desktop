const SENDER_COLORS = [
  '#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa',
  '#fb923c', '#2dd4bf', '#e879f9', '#4ade80', '#f87171',
];

/** Deterministic color for a sender name, based on a simple hash. */
export function senderColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length]!;
}
