/**
 * Locale-aware "fetched … ago" label. Pass an explicit `now` — never default
 * to `Date.now()` here (Cache Components / prerender).
 */
export const formatFetchedAgo = (
  fetchedAt: number,
  now: number,
  locale?: string
): string => {
  const elapsed = Math.max(0, now - fetchedAt)
  const rtf = new Intl.RelativeTimeFormat(locale, {
    numeric: "always",
    style: "narrow",
  })

  if (elapsed < 45_000) return "fetched just now"
  if (elapsed < 45 * 60_000) {
    return `fetched ${rtf.format(-Math.round(elapsed / 60_000), "minute")}`
  }
  if (elapsed < 36 * 3_600_000) {
    return `fetched ${rtf.format(-Math.round(elapsed / 3_600_000), "hour")}`
  }
  return `fetched ${rtf.format(-Math.round(elapsed / 86_400_000), "day")}`
}
