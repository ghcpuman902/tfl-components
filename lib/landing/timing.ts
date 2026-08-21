const EXPOSURE_KEY = "tfl_landing_exposure_at"
/** Ignore exposures older than two hours — a new session, not the current landing. */
const DEFAULT_MAX_AGE_MS = 2 * 60 * 60 * 1000

export const recordLandingExposure = (at = Date.now()) => {
  try {
    window.sessionStorage.setItem(EXPOSURE_KEY, String(at))
  } catch {
    // Analytics must never take down the page.
  }
}

export const elapsedSinceExposureMs = (
  maxAgeMs = DEFAULT_MAX_AGE_MS,
  now = Date.now()
): number | undefined => {
  try {
    const raw = window.sessionStorage.getItem(EXPOSURE_KEY)
    if (!raw) return undefined
    const started = Number.parseInt(raw, 10)
    if (!Number.isFinite(started) || started <= 0) return undefined
    const elapsed = now - started
    if (elapsed < 0 || elapsed > maxAgeMs) return undefined
    return elapsed
  } catch {
    return undefined
  }
}
