"use client"

import { usePathname, useSearchParams } from "next/navigation"
import {
  mergeExplorerChrome,
  parseExplorerPathname,
  type ExplorerState,
} from "@/lib/tfl/explorer-url-state"

/** Overlay `view` / `q` from the query string onto path-parsed explorer state. */
export const useExplorerChromeState = (
  pathState: ExplorerState
): ExplorerState => {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const fromPath = parseExplorerPathname(pathname)
  return mergeExplorerChrome(
    { ...pathState, id: fromPath.id, dir: fromPath.dir },
    searchParams
  )
}

/** Live `q` from the address bar — used when a finder remounts before React search params catch up. */
export const readExplorerQueryParam = (): string => {
  if (typeof window === "undefined") return ""
  return new URLSearchParams(window.location.search).get("q")?.trim() ?? ""
}

/** Update the URL without an RSC request. */
export const pushExplorerHref = (href: string) => {
  window.history.pushState(null, "", href)
}
