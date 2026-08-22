/**
 * Home-screen install policy for the rendered Board.
 *
 * Where: only `/board/view` (the page we will write up for Add to Home Screen).
 * Whether: never when unattended (nobody can dismiss a prompt on a kiosk),
 * never when already launched from the home screen, never in an embed.
 *
 * A prompt UI is not mounted yet — review the copy and dismiss path first.
 * Chromium's native banner is captured and suppressed until then.
 */

import type { BoardBehaviour } from "@/lib/tfl/board-settings"
import { BOARD_VIEW_PATH } from "@/lib/tfl/board-url-state"

export type HomeScreenDisplayMode =
  | "browser"
  | "standalone"
  | "fullscreen"
  | "minimal-ui"

export type HomeScreenPromptPlatform = "ios" | "chromium" | "other"

export type HomeScreenPromptInput = {
  path: string
  behaviour: BoardBehaviour
  embedded: boolean
  displayMode: HomeScreenDisplayMode
  platform: HomeScreenPromptPlatform
  nativePromptAvailable: boolean
}

export const isBoardViewPath = (path: string): boolean =>
  path === BOARD_VIEW_PATH || path.startsWith(`${BOARD_VIEW_PATH}/`)

export const isHomeScreenLaunch = (mode: HomeScreenDisplayMode): boolean =>
  mode === "fullscreen" || mode === "standalone"

export const detectHomeScreenDisplayMode = (input: {
  fullscreen: boolean
  standalone: boolean
  minimalUi: boolean
  iosStandalone?: boolean
}): HomeScreenDisplayMode => {
  if (input.fullscreen) return "fullscreen"
  if (input.standalone || input.iosStandalone) return "standalone"
  if (input.minimalUi) return "minimal-ui"
  return "browser"
}

export const detectHomeScreenPlatform = (input: {
  userAgent: string
  maxTouchPoints?: number
}): HomeScreenPromptPlatform => {
  const ua = input.userAgent
  const touch = input.maxTouchPoints ?? 0
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && touch > 1)) {
    return "ios"
  }
  if (/Chrome|Edg|SamsungBrowser/i.test(ua) && !/Firefox/i.test(ua)) {
    return "chromium"
  }
  return "other"
}

/** True only if a future prompt may be shown. Never used to auto-open UI today. */
export const shouldOfferBoardHomeScreenInstall = (
  input: HomeScreenPromptInput
): boolean => {
  if (!isBoardViewPath(input.path)) return false
  if (input.embedded) return false
  if (input.behaviour === "unattended") return false
  if (isHomeScreenLaunch(input.displayMode)) return false
  if (input.platform === "other") return false
  if (input.platform === "chromium") return input.nativePromptAvailable
  return true
}
