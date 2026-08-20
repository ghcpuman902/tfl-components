/**
 * Replace known secret substrings in a string (URLs, error messages).
 * Site-only helper — never log or surface raw user keys.
 */
export const redactSecrets = (
  value: string,
  secrets: readonly string[]
): string => {
  let next = value
  for (const secret of secrets) {
    if (!secret) continue
    next = next.split(secret).join("•••")
  }
  return next
}
