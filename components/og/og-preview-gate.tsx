"use client"

import { useEffect, useState, type ReactNode } from "react"
import { typekitStylesheetHref } from "@/lib/site-font"

const hideDevIndicator = () => {
  document.querySelectorAll("nextjs-portal").forEach((node) => {
    node.remove()
  })
}

const ensureP22 = (kitId: string) => {
  const root = document.documentElement
  root.setAttribute("data-font", "p22")
  root.setAttribute("data-tfl-type-profile", "johnston-compatible")
  if (document.querySelector('link[data-tfl-typekit="true"]')) return
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = typekitStylesheetHref(kitId)
  link.dataset.tflTypekit = "true"
  document.head.appendChild(link)
}

const waitForP22 = async () => {
  await document.fonts.ready
  await document.fonts.load('600 52px "p22-underground"')
  const deadline = Date.now() + 8000
  while (Date.now() < deadline) {
    if (document.fonts.check('600 52px "p22-underground"')) return
    await new Promise((resolve) => window.setTimeout(resolve, 50))
  }
}

type OgPreviewGateProps = {
  children: ReactNode
  kitId: string
}

/**
 * Capture-only gate: always load P22 (ignore the Hammersmith opt-out),
 * strip the Next.js badge, then paint the card.
 */
export const OgPreviewGate = ({ children, kitId }: OgPreviewGateProps) => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ensureP22(kitId)
    hideDevIndicator()
    const observer = new MutationObserver(hideDevIndicator)
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    })

    const finish = () => {
      hideDevIndicator()
      setReady(true)
    }

    const timeout = window.setTimeout(finish, 10_000)
    void waitForP22().then(finish)

    return () => {
      observer.disconnect()
      window.clearTimeout(timeout)
    }
  }, [kitId])

  if (!ready) {
    return (
      <div className="h-[630px] w-[1200px] bg-white" aria-busy aria-hidden />
    )
  }

  return children
}
