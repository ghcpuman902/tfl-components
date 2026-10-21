"use client"

import { useEffect, useState } from "react"

const fontsLoaded = () =>
  typeof document === "undefined" ||
  !document.fonts ||
  document.fonts.status === "loaded"

/**
 * True once web fonts have loaded. Room-distance surfaces stay invisible
 * until then, so the fallback-font layout never paints and the swap cannot
 * shift anything. Read only after hydration (client-only surfaces).
 */
export const useFontsReady = (): boolean => {
  const [ready, setReady] = useState(fontsLoaded)
  useEffect(() => {
    if (ready) return
    let live = true
    const done = () => {
      if (live) setReady(true)
    }
    document.fonts.ready.then(done, done)
    return () => {
      live = false
    }
  }, [ready])
  return ready
}
