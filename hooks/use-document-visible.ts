"use client"

import { useEffect, useState } from "react"

/**
 * Always starts `true` so SSR HTML matches hydration. Hidden tabs are
 * applied in an effect.
 */
export const useDocumentVisible = (): boolean => {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const handleVisibility = () => {
      setVisible(document.visibilityState === "visible")
    }
    handleVisibility()
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [])

  return visible
}
