/**
 * Browser-only storage for a visitor's TfL API key.
 * Never import from Server Components, Server Actions, or `"use cache"` modules.
 */

export const USER_TFL_CREDENTIALS_STORAGE_KEY = "tfl-user-api-key.v1"

export type UserTflPersistMode = "local" | "session"

export type StoredUserTflCredentials = {
  v: 1
  appKey: string
  persist: UserTflPersistMode
  savedAt: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

export const isPlausibleTflAppKey = (
  value: string
): { ok: true } | { ok: false; warning: string } => {
  const trimmed = value.trim()
  if (!trimmed) {
    return { ok: false, warning: "Enter a TfL API key." }
  }
  if (trimmed.length < 32) {
    return {
      ok: false,
      warning: "Keys from the TfL portal are usually 32+ characters.",
    }
  }
  if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
    return {
      ok: false,
      warning:
        "This doesn’t look like a portal key (letters and numbers only).",
    }
  }
  return { ok: true }
}

export const maskUserTflAppKey = (appKey: string): string => {
  const trimmed = appKey.trim()
  if (trimmed.length < 4) return "••••"
  return `••••${trimmed.slice(-4)}`
}

/** Password-style field value: bullets for the secret, last four visible. */
export type TflKeyDraftChange = {
  /** What the field now holds: the input with any whitespace removed. */
  draft: string
  action: "clear" | "edit" | "invalid" | "save"
}

/**
 * What the key field does with its new value. The field holds the raw key
 * (masked by `type="password"`), so each keystroke or paste arrives whole.
 */
export const tflKeyDraftChange = (input: string): TflKeyDraftChange => {
  const draft = input.replace(/\s+/g, "")
  if (!draft) return { draft, action: "clear" }
  if (!/^[a-zA-Z0-9]+$/.test(draft)) return { draft, action: "invalid" }
  return { draft, action: isPlausibleTflAppKey(draft).ok ? "save" : "edit" }
}

export const displayTflAppKey = (appKey: string): string => {
  const trimmed = appKey.trim()
  if (!trimmed) return ""
  if (trimmed.length <= 4) return trimmed
  return `${"•".repeat(trimmed.length - 4)}${trimmed.slice(-4)}`
}

const parseStored = (raw: string | null): StoredUserTflCredentials | null => {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    if (parsed.v !== 1) return null
    if (typeof parsed.appKey !== "string" || !parsed.appKey.trim()) return null
    if (parsed.persist !== "local" && parsed.persist !== "session") return null
    if (typeof parsed.savedAt !== "number") return null
    return {
      v: 1,
      appKey: parsed.appKey.trim(),
      persist: parsed.persist,
      savedAt: parsed.savedAt,
    }
  } catch {
    return null
  }
}

const getStorage = (persist: UserTflPersistMode): Storage | null => {
  if (typeof window === "undefined") return null
  try {
    return persist === "local" ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

/** Read from session first (tab-scoped), then local. */
export const readStoredUserTflCredentials =
  (): StoredUserTflCredentials | null => {
    if (typeof window === "undefined") return null
    try {
      const fromSession = parseStored(
        window.sessionStorage.getItem(USER_TFL_CREDENTIALS_STORAGE_KEY)
      )
      if (fromSession) return fromSession
      return parseStored(
        window.localStorage.getItem(USER_TFL_CREDENTIALS_STORAGE_KEY)
      )
    } catch {
      return null
    }
  }

export const writeStoredUserTflCredentials = (
  appKey: string,
  persist: UserTflPersistMode,
  savedAt: number
): StoredUserTflCredentials => {
  const payload: StoredUserTflCredentials = {
    v: 1,
    appKey: appKey.trim(),
    persist,
    savedAt,
  }
  const target = getStorage(persist)
  const other = getStorage(persist === "local" ? "session" : "local")
  try {
    other?.removeItem(USER_TFL_CREDENTIALS_STORAGE_KEY)
    target?.setItem(USER_TFL_CREDENTIALS_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Quota / private mode — keep in-memory only via the provider.
  }
  return payload
}

export const clearStoredUserTflCredentials = (): void => {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(USER_TFL_CREDENTIALS_STORAGE_KEY)
    window.sessionStorage.removeItem(USER_TFL_CREDENTIALS_STORAGE_KEY)
  } catch {
    // ignore
  }
}
