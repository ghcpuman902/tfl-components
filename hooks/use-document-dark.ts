"use client"

import { useSyncExternalStore } from "react"

const subscribeDocumentDark = (onStoreChange: () => void) => {
  const root = document.documentElement
  const observer = new MutationObserver(onStoreChange)
  observer.observe(root, { attributes: true, attributeFilter: ["class"] })
  return () => observer.disconnect()
}

const getDocumentDark = () =>
  document.documentElement.classList.contains("dark")

/** Follows the `.dark` class on `<html>` — portable, no next-themes. */
export const useDocumentDark = (): boolean =>
  useSyncExternalStore(subscribeDocumentDark, getDocumentDark, () => false)
