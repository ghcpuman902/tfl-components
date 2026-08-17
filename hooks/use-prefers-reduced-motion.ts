"use client"

import { useEffect, useState } from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

/**
 * Always starts `false` on the server and the first client render so SSR
 * HTML matches hydration. The real preference is applied in an effect.
 */
export const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const handleChange = () => {
      setReduced(mql.matches)
    }
    handleChange()
    mql.addEventListener("change", handleChange)
    return () => mql.removeEventListener("change", handleChange)
  }, [])

  return reduced
}
