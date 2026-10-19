"use client"

import { useLayoutEffect } from "react"
import {
  LANDING_TOUCH_TOOLBAR_QUERY,
  LANDING_VIEWPORT_HEIGHT_VAR,
  LANDING_VIEWPORT_WIDTH_ATTR,
  landingViewportHeightPx,
  shouldRemeasureLandingViewport,
} from "@/lib/landing/hero-viewport"

/** iOS reports the rotated client box a little after `resize`. */
const SETTLE_MS = 160

/**
 * Keeps `--landing-viewport-height` (see `lib/landing/hero-viewport.ts`)
 * fixed through toolbar collapse. Re-measures on width / orientation
 * changes only, plus real window resizes on non-touch desktops.
 * Client navigations skip the inline boot script, so mount measures too.
 */
export const useStableLandingViewport = () => {
  useLayoutEffect(() => {
    const root = document.documentElement
    const touchToolbar = window.matchMedia(LANDING_TOUCH_TOOLBAR_QUERY)
    const last = {
      width: Number(root.getAttribute(LANDING_VIEWPORT_WIDTH_ATTR)) || -1,
      height:
        Number.parseFloat(
          root.style.getPropertyValue(LANDING_VIEWPORT_HEIGHT_VAR)
        ) || -1,
    }

    const write = () => {
      last.width = root.clientWidth
      last.height = root.clientHeight
      root.style.setProperty(
        LANDING_VIEWPORT_HEIGHT_VAR,
        landingViewportHeightPx(last.height)
      )
      root.setAttribute(LANDING_VIEWPORT_WIDTH_ATTR, String(last.width))
    }

    const check = () => {
      if (
        last.width < 0 ||
        last.height < 0 ||
        shouldRemeasureLandingViewport({
          previousWidth: last.width,
          nextWidth: root.clientWidth,
          previousHeight: last.height,
          nextHeight: root.clientHeight,
          touchToolbar: touchToolbar.matches,
        })
      ) {
        write()
      }
    }

    check()

    let frame = 0
    let settle = 0
    const handleResize = () => {
      if (settle) window.clearTimeout(settle)
      settle = window.setTimeout(() => {
        settle = 0
        check()
      }, SETTLE_MS)
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        check()
      })
    }
    window.addEventListener("resize", handleResize)
    window.addEventListener("orientationchange", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleResize)
      if (frame) window.cancelAnimationFrame(frame)
      if (settle) window.clearTimeout(settle)
    }
  }, [])
}

/** Current stable height in px, for scroll maths that must match the CSS. */
export const readStableLandingViewportHeight = (): number => {
  const root = document.documentElement
  const value = Number.parseFloat(
    root.style.getPropertyValue(LANDING_VIEWPORT_HEIGHT_VAR)
  )
  return value > 0 ? value : root.clientHeight
}
