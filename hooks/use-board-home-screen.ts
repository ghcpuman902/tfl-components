"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import {
  detectHomeScreenDisplayMode,
  detectHomeScreenPlatform,
  isHomeScreenLaunch,
  isJsFullscreenActive,
  type HomeScreenDisplayMode,
  type HomeScreenPromptPlatform,
} from "@/lib/tfl/board-home-screen"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
}

const DISPLAY_MODE_QUERIES = [
  "(display-mode: fullscreen)",
  "(display-mode: standalone)",
  "(display-mode: minimal-ui)",
] as const

const FULLSCREEN_EVENTS = ["fullscreenchange", "webkitfullscreenchange"] as const

const subscribeDisplayMode = (onStoreChange: () => void) => {
  const queries = DISPLAY_MODE_QUERIES.map((query) => window.matchMedia(query))
  for (const media of queries) {
    media.addEventListener("change", onStoreChange)
  }
  for (const event of FULLSCREEN_EVENTS) {
    document.addEventListener(event, onStoreChange)
  }
  return () => {
    for (const media of queries) {
      media.removeEventListener("change", onStoreChange)
    }
    for (const event of FULLSCREEN_EVENTS) {
      document.removeEventListener(event, onStoreChange)
    }
  }
}

const readJsFullscreen = (): boolean => {
  const doc = document as Document & { webkitFullscreenElement?: Element | null }
  return isJsFullscreenActive({
    fullscreenElement: document.fullscreenElement,
    webkitFullscreenElement: doc.webkitFullscreenElement ?? null,
  })
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

const subscribeJsFullscreen = (onStoreChange: () => void) => {
  for (const event of FULLSCREEN_EVENTS) {
    document.addEventListener(event, onStoreChange)
  }
  return () => {
    for (const event of FULLSCREEN_EVENTS) {
      document.removeEventListener(event, onStoreChange)
    }
  }
}

const getServerJsFullscreen = (): boolean => false

const HOME_SCREEN_PADDING = {
  paddingTop: "max(1rem, env(safe-area-inset-top))",
  paddingRight: "max(1rem, env(safe-area-inset-right))",
  paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
  paddingLeft: "max(1rem, env(safe-area-inset-left))",
} as const

/**
 * Home-screen launch detection. Chromium's native banner is captured;
 * call `promptNativeInstall` only from an explicit user action.
 */
export const useBoardHomeScreen = () => {
  const displayMode = useSyncExternalStore(
    subscribeDisplayMode,
    readDisplayMode,
    getServerDisplayMode
  )
  const jsFullscreenActive = useSyncExternalStore(
    subscribeJsFullscreen,
    readJsFullscreen,
    getServerJsFullscreen
  )
  const fromHomeScreen = isHomeScreenLaunch(displayMode, jsFullscreenActive)
  const [nativePrompt, setNativePrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [platform, setPlatform] = useState<HomeScreenPromptPlatform>("other")

  useEffect(() => {
    setPlatform(
      detectHomeScreenPlatform({
        userAgent: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
      })
    )
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setNativePrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const promptNativeInstall = useCallback(() => {
    const event = nativePrompt
    if (!event) return
    void event.prompt()
  }, [nativePrompt])

  return {
    displayMode,
    fromHomeScreen,
    jsFullscreenActive,
    platform,
    nativePromptAvailable: Boolean(nativePrompt),
    promptNativeInstall,
    homeScreenPadding: fromHomeScreen ? HOME_SCREEN_PADDING : undefined,
  }
}
