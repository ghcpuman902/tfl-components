import * as React from "react"

const MOBILE_BREAKPOINT = 768

/** Resolve at interaction time so a tap cannot race the hydration effect. */
export const isMobileViewport = () =>
  typeof window !== "undefined" &&
  window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches

/**
 * Viewport &lt; md. Always starts `false` on server and the first client render
 * so Sidebar SSR HTML matches hydration; real width is applied in an effect.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(isMobileViewport())
    }
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
