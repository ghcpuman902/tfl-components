import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Viewport &lt; md. Always starts `false` on server and the first client render
 * so Sidebar SSR HTML matches hydration; real width is applied in an effect.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
