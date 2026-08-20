import {
  BOARD_VIEW_PATH,
  buildBoardHref,
  type BoardConfig,
} from "@/lib/tfl/board-url-state"

export type BoardKeyMode = "browser" | "portable"

export const BOARD_KEY_MODE_LABEL: Record<BoardKeyMode, string> = {
  browser: "Key saved on this browser",
  portable: "Key in this link",
}

export const boardKeyModeFromPersist = (
  persist: "local" | "session" | undefined,
  hasStoredKey: boolean
): BoardKeyMode => {
  if (hasStoredKey && persist === "local") return "browser"
  return "portable"
}

/** Config used to generate a shareable Board URL for the chosen key mode. */
export const boardConfigForShare = (
  config: Partial<BoardConfig>,
  mode: BoardKeyMode
): Partial<BoardConfig> => {
  if (mode === "browser") {
    return { ...config, key: undefined }
  }
  return config
}

export const buildShareableBoardHref = (
  config: Partial<BoardConfig>,
  mode: BoardKeyMode
): string => buildBoardHref(boardConfigForShare(config, mode))

export const buildShareableBoardUrl = (
  origin: string,
  config: Partial<BoardConfig>,
  mode: BoardKeyMode
): string => {
  const href = buildShareableBoardHref(config, mode)
  if (!origin) return href
  return `${origin}${href}`
}

/** QR encodes the exact shareable URL — never a remote shortener. */
export const boardQrPayload = (url: string): string => url

export const shareUrlIncludesKey = (url: string): boolean => {
  const hashIndex = url.indexOf("#")
  if (hashIndex === -1) return false
  const hash = url.slice(hashIndex + 1)
  return new URLSearchParams(hash).has("key")
}

export const shareUrlKeyIsOnlyInHash = (url: string): boolean => {
  try {
    const parsed = new URL(url, "https://tfl.manglekuo.com")
    if (parsed.searchParams.has("key")) return false
    return shareUrlIncludesKey(url)
  } catch {
    return false
  }
}

export const BOARD_VIEW_CANONICAL_PATH = BOARD_VIEW_PATH
