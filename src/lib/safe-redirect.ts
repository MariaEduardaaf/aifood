// Only same-origin relative paths are allowed as post-login redirects.
// Rejects absolute URLs, schemes (javascript:, data:), protocol-relative
// "//host" and backslash variants that browsers normalise to "//".
export function safeCallbackUrl(
  value: string | null | undefined,
  fallback: string,
): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return fallback;
  }
  return value;
}
