/**
 * Sanitize an error before it crosses process boundaries (IPC, WS, logs).
 * Strips stack traces and ensures no sensitive data leaks into messages.
 */
export function sanitizeError(err: unknown): { message: string } {
  if (err instanceof Error) {
    // Strip anything after the first line to remove stack traces and file paths
    const firstLine = err.message.split('\n')[0] ?? 'An error occurred';
    return { message: firstLine };
  }
  if (typeof err === 'string') {
    return { message: err.split('\n')[0] ?? 'An error occurred' };
  }
  return { message: 'An unexpected error occurred' };
}

/**
 * Redact message body content from a string (e.g. for safe logging).
 * Replaces anything that looks like a message body with [REDACTED].
 */
export function redactForLog(text: string): string {
  // Replace quoted strings longer than 20 chars (likely message bodies)
  return text.replace(/"[^"]{20,}"/g, '"[REDACTED]"');
}
