"use client"

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  FONT_STORAGE_KEY,
  resolveFontPreference,
  typekitStylesheetHref,
  type FontPreference,
} from "@/lib/site-font"

export type { FontPreference }

type FontPreferenceContextValue = {
  font: FontPreference
  setFont: (font: FontPreference) => void
  adobeFontsConfigured: boolean
}

const FontPreferenceContext = createContext<FontPreferenceContextValue | null>(
  null
)

const typekitHref = (): string | null => {
  const kitId = process.env.NEXT_PUBLIC_ADOBE_FONTS_KIT_ID
  return kitId ? typekitStylesheetHref(kitId) : null
}

/** Load P22 kit CSS once. Hammersmith One stays on next/font as the fallback. */
const ensureTypekitStylesheet = () => {
  const href = typekitHref()
  if (!href || typeof document === "undefined") return

  const existing = document.querySelector<HTMLLinkElement>(
    `link[data-tfl-typekit="true"]`
  )
  if (existing) return

  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = href
  link.dataset.tflTypekit = "true"
  link.media = "print"
  link.onload = () => {
    link.media = "all"
  }
  document.head.appendChild(link)
}

const applyFontAttributes = (
  font: FontPreference,
  adobeFontsConfigured: boolean
) => {
  document.documentElement.removeAttribute("data-tfl-type-profile")

  if (font === "p22" && adobeFontsConfigured) {
    ensureTypekitStylesheet()
    document.documentElement.setAttribute("data-font", "p22")
    document.documentElement.setAttribute(
      "data-tfl-type-profile",
      "johnston-compatible"
    )
    return
  }

  document.documentElement.removeAttribute("data-font")
}

/**
 * Site-wide body font switch (P22 Underground by default vs Hammersmith One),
 * persisted to localStorage.
 */
export const FontPreferenceProvider = ({
  children,
  adobeFontsConfigured,
}: {
  children: ReactNode
  adobeFontsConfigured: boolean
}) => {
  const [font, setFontState] = useState<FontPreference>(
    adobeFontsConfigured ? "p22" : "hammersmith"
  )

  useEffect(() => {
    const stored = window.localStorage.getItem(FONT_STORAGE_KEY)
    const initialFont = resolveFontPreference(stored, adobeFontsConfigured)
    startTransition(() => setFontState(initialFont))
    applyFontAttributes(initialFont, adobeFontsConfigured)
  }, [adobeFontsConfigured])

  const setFont = useCallback(
    (next: FontPreference) => {
      const selectedFont = resolveFontPreference(next, adobeFontsConfigured)
      setFontState(selectedFont)
      applyFontAttributes(selectedFont, adobeFontsConfigured)
      window.localStorage.setItem(FONT_STORAGE_KEY, selectedFont)
    },
    [adobeFontsConfigured]
  )

  const value = useMemo(
    () => ({
      font,
      setFont,
      adobeFontsConfigured,
    }),
    [adobeFontsConfigured, font, setFont]
  )

  return (
    <FontPreferenceContext.Provider value={value}>
      {children}
    </FontPreferenceContext.Provider>
  )
}

export const useFontPreference = (): FontPreferenceContextValue => {
  const context = useContext(FontPreferenceContext)
  if (!context) {
    throw new Error(
      "useFontPreference must be used within FontPreferenceProvider"
    )
  }
  return context
}
