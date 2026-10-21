/**
 * Glance tap-to-pin: which line + direction a touch board shows large, per
 * stop. Same localStorage pattern as the installed-board record; failures
 * (private mode, quota) just mean the pin lasts for this page only.
 */

export const BOARD_GLANCE_PIN_STORAGE_KEY = "tfl-board-glance-pin.v1"

type PinRecord = Record<string, string>

const storage = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

const readAll = (): PinRecord => {
  try {
    const raw = storage()?.getItem(BOARD_GLANCE_PIN_STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {}
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    )
  } catch {
    return {}
  }
}

export const readGlancePin = (stopId: string): string | null =>
  readAll()[stopId] ?? null

export const writeGlancePin = (
  stopId: string,
  groupKey: string | null
): void => {
  try {
    const next = readAll()
    if (groupKey) next[stopId] = groupKey
    else delete next[stopId]
    storage()?.setItem(BOARD_GLANCE_PIN_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable: the pin still holds in memory.
  }
}
