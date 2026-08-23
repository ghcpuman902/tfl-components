/**
 * Home-screen install policy and launch detection for `/board/view`.
 *
 * `display-mode: fullscreen` can mean an installed app or a JavaScript
 * Fullscreen API session. Check the active fullscreen element before
 * treating fullscreen as a Home Screen launch.
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
  fullscreenApiAvailable: boolean
  jsFullscreenActive?: boolean
}

export const BOARD_HOME_SCREEN_DISMISS_KEY = "tfl-board-aths-dismissed.v1"

export const isBoardViewPath = (path: string): boolean =>
  path === BOARD_VIEW_PATH || path.startsWith(`${BOARD_VIEW_PATH}/`)

export const isJsFullscreenActive = (input: {
  fullscreenElement: Element | null
  webkitFullscreenElement?: Element | null
}): boolean =>
  Boolean(input.fullscreenElement || input.webkitFullscreenElement)

export const isHomeScreenLaunch = (
  mode: HomeScreenDisplayMode,
  jsFullscreenActive = false
): boolean => {
  if (mode === "standalone") return true
  if (mode === "fullscreen") return !jsFullscreenActive
  return false
}

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

export const canElementRequestFullscreen = (
  element: {
    requestFullscreen?: unknown
    webkitRequestFullscreen?: unknown
  } | null,
  documentAllowsFullscreen: boolean
): boolean => {
  if (!element || !documentAllowsFullscreen) return false
  return (
    typeof element.requestFullscreen === "function" ||
    typeof element.webkitRequestFullscreen === "function"
  )
}

/** iOS instruction sheet or Chromium explicit install action. */
export const shouldOfferBoardHomeScreenInstall = (
  input: HomeScreenPromptInput
): boolean => {
  if (!isBoardViewPath(input.path)) return false
  if (input.embedded) return false
  if (input.behaviour === "unattended") return false
  if (isHomeScreenLaunch(input.displayMode, input.jsFullscreenActive)) {
    return false
  }
  if (input.fullscreenApiAvailable) return false
  if (input.platform === "other") return false
  if (input.platform === "chromium") return input.nativePromptAvailable
  return true
}

export const readHomeScreenOfferDismissed = (): boolean => {
  if (typeof window === "undefined") return false
  try {
    return window.sessionStorage.getItem(BOARD_HOME_SCREEN_DISMISS_KEY) === "1"
  } catch {
    return false
  }
}

export const writeHomeScreenOfferDismissed = (): void => {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(BOARD_HOME_SCREEN_DISMISS_KEY, "1")
  } catch {
    // ignore
  }
}
