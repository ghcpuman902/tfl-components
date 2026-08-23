"use client"

import {
  useCallback,
  useEffect,
  useState,
  type RefObject,
} from "react"
import { canElementRequestFullscreen } from "@/lib/tfl/board-home-screen"

type WebkitDocument = Document & {
  webkitFullscreenEnabled?: boolean
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => void
}

type WebkitElement = Element & {
  webkitRequestFullscreen?: () => void
}

const documentAllowsFullscreen = (): boolean => {
  const doc = document as WebkitDocument
  return Boolean(document.fullscreenEnabled || doc.webkitFullscreenEnabled)
}

const readJsFullscreenElement = (): Element | null => {
  const doc = document as WebkitDocument
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null
}

const FULLSCREEN_EVENTS = ["fullscreenchange", "webkitfullscreenchange"] as const

export const useBoardFullscreen = (
  rootRef: RefObject<HTMLElement | null>,
  options: { enabled: boolean }
) => {
  const [active, setActive] = useState(false)
  const [available, setAvailable] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!options.enabled) {
      setAvailable(false)
      setActive(false)
      return
    }
    const sync = () => {
      setActive(Boolean(readJsFullscreenElement()))
      setAvailable(
        canElementRequestFullscreen(rootRef.current, documentAllowsFullscreen())
      )
    }
    sync()
    for (const event of FULLSCREEN_EVENTS) {
      document.addEventListener(event, sync)
    }
    return () => {
      for (const event of FULLSCREEN_EVENTS) {
        document.removeEventListener(event, sync)
      }
    }
  }, [options.enabled, rootRef])

  const toggle = useCallback(() => {
    setError(null)
    const element = rootRef.current as WebkitElement | null
    if (!element) {
      setError("Full screen is not available.")
      return
    }
    const doc = document as WebkitDocument
    if (readJsFullscreenElement()) {
      if (typeof document.exitFullscreen === "function") {
        void document.exitFullscreen().catch(() => {
          setError("Full screen is not available.")
        })
        return
      }
      if (typeof doc.webkitExitFullscreen === "function") {
        try {
          doc.webkitExitFullscreen()
        } catch {
          setError("Full screen is not available.")
        }
      }
      return
    }
    if (typeof element.requestFullscreen === "function") {
      void element.requestFullscreen().catch(() => {
        setError("Full screen is not available.")
      })
      return
    }
    if (typeof element.webkitRequestFullscreen === "function") {
      try {
        element.webkitRequestFullscreen()
      } catch {
        setError("Full screen is not available.")
      }
      return
    }
    setError("Full screen is not available.")
  }, [rootRef])

  return { active, available, error, toggle }
}
