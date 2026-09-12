/** Show a route shell if the new page has not committed by this time. */
export const NAVIGATION_SHELL_DELAY_MS = 150

const pathFromHref = (href: string) => href.split("#")[0]?.split("?")[0] ?? ""

/**
 * Internal same-tab navigations that should get a click-time shell when
 * `loading.js` has not been prefetched yet (slow network / first visit).
 */
export const shouldShowNavigationShell = (
  href: string,
  currentPathname: string
) => {
  if (!href.startsWith("/") || href.startsWith("//")) return false
  const path = pathFromHref(href)
  return path.length > 0 && path !== currentPathname
}

export const isDocsHref = (href: string) => {
  const path = pathFromHref(href)
  return path === "/docs" || path.startsWith("/docs/")
}
