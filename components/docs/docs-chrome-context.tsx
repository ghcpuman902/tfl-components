"use client"

import { createContext, useContext } from "react"

type DocsChromeContextValue = {
  /** Prev/next live in persistent chrome, not the page header. */
  persistentToolbar: boolean
}

const DocsChromeContext = createContext<DocsChromeContextValue>({
  persistentToolbar: false,
})

export const DocsChromeProvider = DocsChromeContext.Provider

export const useDocsChrome = () => useContext(DocsChromeContext)
