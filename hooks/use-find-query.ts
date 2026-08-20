"use client"

import { useSyncExternalStore } from "react"
import { normalizeFindPhrase } from "@/lib/tfl/find-coverage"

let findQuery = ""
const listeners = new Set<() => void>()
let bound = false

const handleSelectionChange = () => {
  const next = normalizeFindPhrase(document.getSelection()?.toString() ?? "")
  if (next === findQuery) return
  findQuery = next
  listeners.forEach((listener) => listener())
}

/** Find-in-page may set the match selection just after `beforematch`. */
const handleBeforeMatch = () => {
  handleSelectionChange()
  queueMicrotask(handleSelectionChange)
}

const subscribeFindQuery = (onStoreChange: () => void) => {
  listeners.add(onStoreChange)
  if (!bound) {
    bound = true
    document.addEventListener("selectionchange", handleSelectionChange)
    document.addEventListener("beforematch", handleBeforeMatch, true)
  }
  return () => {
    listeners.delete(onStoreChange)
  }
}

const getFindQuery = () => findQuery

/**
 * The current find-in-page (or user) selection, normalised. Used to mount
 * hidden find chips only when the query would not already hit painted text.
 */
export const useFindQuery = (): string =>
  useSyncExternalStore(subscribeFindQuery, getFindQuery, () => "")
