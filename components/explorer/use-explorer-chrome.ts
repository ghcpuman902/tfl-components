"use client"

import { useSearchParams } from "next/navigation"
import {
  mergeExplorerChrome,
  type ExplorerState,
} from "@/lib/tfl/explorer-url-state"

/** Overlay `view` / `q` from the query string onto path-parsed explorer state. */
export const useExplorerChromeState = (
  pathState: ExplorerState
): ExplorerState => {
  const searchParams = useSearchParams()
  return mergeExplorerChrome(pathState, searchParams)
}

/** Update the URL without an RSC request. */
export const pushExplorerHref = (href: string) => {
  window.history.pushState(null, "", href)
}
