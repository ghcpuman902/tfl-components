"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

// next-themes injects an inline <script> to prevent FOUC. React 19 warns that
// scripts inside components are not executed on the client — a false positive
// here: the script runs correctly from the SSR HTML. Filter until next-themes
// lands a useServerInsertedHTML-based fix.
const themeScriptWarningKey = "__tflSuppressThemeScriptWarning__"
if (
  process.env.NODE_ENV === "development" &&
  typeof globalThis !== "undefined" &&
  !(globalThis as Record<string, unknown>)[themeScriptWarningKey]
) {
  ;(globalThis as Record<string, unknown>)[themeScriptWarningKey] = true
  const originalConsoleError = console.error
  console.error = (...args: unknown[]) => {
    const first = args[0]
    if (
      typeof first === "string" &&
      first.includes("Encountered a script tag")
    ) {
      return
    }
    originalConsoleError.apply(console, args)
  }
}

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <ThemeHotkey />
      {children}
    </NextThemesProvider>
  )
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}

export { ThemeProvider }
