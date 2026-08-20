import type { RealtimePrediction } from "tfl-ts"

export type DualPathSource = "site" | "user"

export type DualPathArrivalsResult =
  | { ok: true; arrivals: RealtimePrediction[]; source: DualPathSource }
  | { ok: false; error: string; source: DualPathSource }

export type CredentialsPathInput = "empty" | "validating" | "ready" | "invalid"

/**
 * Choose which path a demo should use given credential status.
 * `invalid` stays on the user path so we never silently fall back to the site key.
 */
export const selectArrivalsDataPath = (
  status: CredentialsPathInput
): DualPathSource => {
  if (status === "ready" || status === "invalid") return "user"
  return "site"
}

/** Whether a document visibility state should pause polling. */
export const shouldPausePollingForVisibility = (
  visibilityState: DocumentVisibilityState
): boolean => visibilityState === "hidden"

/**
 * True when the payload is empty, or at least one row belongs to `stopIds`.
 * Used to drop a stale/wrong-stop cache hit after the URL stop changes.
 */
export const arrivalsBelongToStops = (
  arrivals: readonly Pick<RealtimePrediction, "naptanId">[],
  stopIds: readonly string[]
): boolean => {
  if (arrivals.length === 0) return true
  const expected = new Set(stopIds.map((id) => id.trim()).filter(Boolean))
  if (expected.size === 0) return false
  return arrivals.some((row) => {
    const id = row.naptanId?.trim()
    return Boolean(id && expected.has(id))
  })
}
