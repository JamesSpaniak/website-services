/**
 * Log-safe rendering of an email address: keeps the first character of the
 * local part and the domain (`j***@gmail.com`) — enough to tell two log lines
 * apart, not enough to identify the person. Strings without `@` (usernames)
 * pass through unchanged so login identifiers can be masked unconditionally.
 */
export function maskEmail(value: string | null | undefined): string {
  if (!value) return '';
  const at = value.lastIndexOf('@');
  if (at < 0) return value;
  return `${value.slice(0, 1)}***${value.slice(at)}`;
}
