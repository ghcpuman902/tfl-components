/**
 * Painted bus stop letters — the red circle on a flag / arrivals header.
 *
 * Probed 2026-08-15 (Wapping, The Highway, Trafalgar Square, Oxford Circus,
 * Liverpool Street):
 * - Real letters are 1–2 A–Z (`E`, `RG`, `CV`). Never invent from the name.
 * - NaPTAN suffix is not the letter (`490000251W` is Stop R, not W).
 * - `->W` / `->E` are compass markers on stops with no painted letter.
 * - Search hits are thin (id / name / towards). Letter lives on
 *   `stopPoint.get` / `getByGeoPoint`, or as `platformName` on arrivals.
 */

const PAINTED_STOP_LETTER = /^[A-Z]{1,2}$/

/** TfL sometimes sends the literal string `"null"` instead of omitting a field. */
export const usableTflText = (value?: string | null): string | undefined => {
  const trimmed = value?.trim()
  if (!trimmed || /^(null|undefined)$/i.test(trimmed)) return undefined
  return trimmed
}

/** `Stop RG` / `rg` / `E` → `RG` / `E`. Arrows and stands → undefined. */
export const normaliseBusStopLetter = (
  raw?: string | null
): string | undefined => {
  const stripped = raw
    ?.replace(/^stop\s+/i, "")
    .trim()
    .toUpperCase()
  if (!stripped || !PAINTED_STOP_LETTER.test(stripped)) return undefined
  return stripped
}

export const readStopLetter = (
  stopLetter?: string | null,
  indicator?: string | null
): string | undefined =>
  normaliseBusStopLetter(stopLetter) ?? normaliseBusStopLetter(indicator)

export const getBusStopLetterFromPlatform = (
  platformName?: string | null
): string | null => normaliseBusStopLetter(platformName) ?? null

export const resolveBusStopLetter = (
  stopLetter: string | undefined,
  rows: readonly { platformName?: string }[]
): string | null => {
  const fromProp = normaliseBusStopLetter(stopLetter)
  if (fromProp) return fromProp
  for (const row of rows) {
    const letter = getBusStopLetterFromPlatform(row.platformName)
    if (letter) return letter
  }
  return null
}
