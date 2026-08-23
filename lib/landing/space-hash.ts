export const LANDING_SPACE_HASH = "#space"

export const hasLandingSpaceHash = (hash: string): boolean => {
  const value = hash.startsWith("#") ? hash : `#${hash}`
  return value === LANDING_SPACE_HASH
}

export const landingUrlWithSpaceHash = (
  pathname: string,
  search = ""
): string => `${pathname}${search}${LANDING_SPACE_HASH}`

export const landingUrlWithoutHash = (pathname: string, search = ""): string =>
  `${pathname}${search}`

export const landingRoomScrollTop = ({
  wrapperTop,
  wrapperHeight,
  scrollY,
  viewportHeight,
}: {
  wrapperTop: number
  wrapperHeight: number
  scrollY: number
  viewportHeight: number
}): number =>
  Math.max(0, scrollY + wrapperTop + wrapperHeight - viewportHeight)

/** Runs before React so a restored mid-page scroll cannot flash the room. */
export const LANDING_SCROLL_BOOT_SCRIPT = `(function(){if(location.hash===${JSON.stringify(LANDING_SPACE_HASH)})return;try{history.scrollRestoration="manual"}catch(e){}scrollTo(0,0)})()`
