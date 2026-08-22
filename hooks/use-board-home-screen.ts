"use client"

import { useEffect, useSyncExternalStore } from "react"
import {
  detectHomeScreenDisplayMode,
  isHomeScreenLaunch,
  type HomeScreenDisplayMode,
} from "@/lib/tfl/board-home-screen"

const DISPLAY_MODE_QUERIES = [
  "(display-mode: fullscreen)",
  "(display-mode: standalone)",
  "(display-mode: minimal-ui)",
] as const

const subscribeDisplayMode = (onStoreChange: () => void) => {
  const queries = DISPLAY_MODE_QUERIES.map((query) => window.matchMedia(query))
  for (const media of queries) {
    media.addEventListener("change", onStoreChange)
  }
  return () => {
    for (const media of queries) {
      media.removeEventListener("change", onStoreChange)
    }
  }
}

const readDisplayMode = (): HomeScreenDisplayMode =>
  detectHomeScreenDisplayMode({
    fullscreen: window.matchMedia("(display-mode: fullscreen)").matches,
    standalone: window.matchMedia("(display-mode: standalone)").matches,
    minimalUi: window.matchMedia("(display-mode: minimal-ui)").matches,
    iosStandalone: Boolean(
      "standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone
    ),
  })

const getServerDisplayMode = (): HomeScreenDisplayMode => "browser"

const HOME_SCREEN_PADDING = {
  paddingTop: "max(1rem, env(safe-area-inset-top))",
  paddingRight: "max(1rem, env(safe-area-inset-right))",
  paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
  paddingLeft: "max(1rem, env(safe-area-inset-left))",
} as const

/**
 * Home-screen launch detection plus a kiosk-safe install-prompt guard.
 * Chromium's native banner is always captured and never shown — unattended
 * boards cannot dismiss it. A custom offer stays off until review.
 */
export const useBoardHomeScreen = () => {
  const displayMode = useSyncExternalStore(
    subscribeDisplayMode,
    readDisplayMode,
    getServerDisplayMode
  )
  const fromHomeScreen = isHomeScreenLaunch(displayMode)

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  return {
    displayMode,
    fromHomeScreen,
    homeScreenPadding: fromHomeScreen ? HOME_SCREEN_PADDING : undefined,
  }
}
