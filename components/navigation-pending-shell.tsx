"use client"

import { useEffect, useRef, useState } from "react"
import {
  AppRouteLoading,
  DocsRouteLoading,
} from "@/components/docs/docs-route-loading"
import {
  isDocsHref,
  NAVIGATION_SHELL_DELAY_MS,
  shouldShowNavigationShell,
} from "@/lib/navigation-pending"

const MAX_PENDING_MS = 15_000

const hrefFromClick = (event: MouseEvent) => {
  if (event.defaultPrevented || event.button !== 0) return null
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null
  }
  const target = event.target
  if (!(target instanceof Element)) return null
  const anchor = target.closest("a[href]")
  if (!(anchor instanceof HTMLAnchorElement)) return null
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
    return null
  }
  const href = anchor.getAttribute("href")
  return href && href.startsWith("/") ? href : null
}

/**
 * If a client navigation has not committed after 150ms, paint the same
 * article shell `loading.tsx` would. Covers the official gap: prefetch of
 * the loading fallback is not finished (slow network / first tap).
 */
export const NavigationPendingShell = ({ pathname }: { pathname: string }) => {
  const pathnameRef = useRef(pathname)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    let delayTimer = 0
    let maxTimer = 0

    const clearTimers = () => {
      window.clearTimeout(delayTimer)
      window.clearTimeout(maxTimer)
    }

    const handleClick = (event: MouseEvent) => {
      const href = hrefFromClick(event)
      if (!href || !shouldShowNavigationShell(href, pathnameRef.current)) {
        return
      }

      clearTimers()
      delayTimer = window.setTimeout(() => {
        setPendingHref(href)
      }, NAVIGATION_SHELL_DELAY_MS)
      maxTimer = window.setTimeout(() => {
        setPendingHref(null)
      }, MAX_PENDING_MS)
    }

    document.addEventListener("click", handleClick, true)
    return () => {
      clearTimers()
      document.removeEventListener("click", handleClick, true)
    }
  }, [])

  const shellHref =
    pendingHref && shouldShowNavigationShell(pendingHref, pathname)
      ? pendingHref
      : null

  if (!shellHref) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 bg-background"
      role="status"
      aria-live="polite"
    >
      {isDocsHref(shellHref) ? <DocsRouteLoading /> : <AppRouteLoading />}
    </div>
  )
}
