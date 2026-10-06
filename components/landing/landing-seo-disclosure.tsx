"use client"

import { useLayoutEffect, useRef, type ReactNode } from "react"
import { MOBILE_BREAKPOINT } from "@/hooks/use-mobile"

type LandingSeoDisclosureProps = {
  children: ReactNode
}

const DESKTOP_MEDIA_QUERY = `(min-width: ${MOBILE_BREAKPOINT}px)`

/**
 * Phone: the homepage copy stays in the DOM, collapsed behind About.
 * md+: the same copy is the open section under the scroll story.
 */
export const LandingSeoDisclosure = ({
  children,
}: LandingSeoDisclosureProps) => {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useLayoutEffect(() => {
    const details = detailsRef.current
    if (!details) return
    const media = window.matchMedia(DESKTOP_MEDIA_QUERY)
    const sync = () => {
      details.open = media.matches
    }
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  return (
    <details ref={detailsRef} className="landing-seo w-full">
      <summary className="mx-auto flex min-h-11 w-full max-w-6xl cursor-pointer list-none items-center justify-center px-4 py-3 text-sm text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none md:hidden [&::-webkit-details-marker]:hidden">
        About
      </summary>
      {children}
    </details>
  )
}
