/**
 * Landing hero height, measured once instead of tracking the viewport.
 *
 * Mobile browsers resize the viewport whenever their toolbars collapse or
 * expand (iOS Safari's bottom bar on scroll). Anything sized from `dvh`,
 * `svh`/`lvh` swaps, `innerHeight` or `visualViewport` on resize follows
 * that animation, so the whole corridor wiggles. The hero reads one CSS
 * variable instead, written in px before first paint and rewritten only
 * when the width changes (rotation, split view) — or, on a desktop with no
 * collapsing toolbar, when the window really is resized.
 *
 * The measurement is `document.documentElement.clientHeight`: the initial
 * containing block, which does not change when the toolbars collapse.
 */

export const LANDING_VIEWPORT_HEIGHT_VAR = "--landing-viewport-height"
export const LANDING_VIEWPORT_WIDTH_ATTR = "data-landing-viewport-width"

/** Before the boot script runs (no JS), a fixed phone-sized height. */
const LANDING_VIEWPORT_HEIGHT_FALLBACK = "40rem"

export const LANDING_VIEWPORT_HEIGHT = `var(${LANDING_VIEWPORT_HEIGHT_VAR}, ${LANDING_VIEWPORT_HEIGHT_FALLBACK})`

/** First fold under the site header. */
export const LANDING_HERO_HEIGHT = `calc(${LANDING_VIEWPORT_HEIGHT} - var(--site-header-height))`

/** md+ scroll runway: one extra stable viewport for the camera story. */
export const LANDING_RUNWAY_DESKTOP_HEIGHT = `calc(${LANDING_VIEWPORT_HEIGHT} * 2 - var(--site-header-height))`

/**
 * Touch devices with browser chrome that collapses on scroll. Height-only
 * resizes there are the toolbar (or keyboard), never a reason to re-lay out.
 */
export const LANDING_TOUCH_TOOLBAR_QUERY = "(hover: none) and (pointer: coarse)"

export const shouldRemeasureLandingViewport = ({
  previousWidth,
  nextWidth,
  previousHeight,
  nextHeight,
  touchToolbar,
}: {
  previousWidth: number
  nextWidth: number
  previousHeight: number
  nextHeight: number
  touchToolbar: boolean
}): boolean => {
  if (Math.abs(nextWidth - previousWidth) >= 1) return true
  if (touchToolbar) return false
  return Math.abs(nextHeight - previousHeight) >= 1
}

/** Pixel value for the variable from the root element's client box. */
export const landingViewportHeightPx = (clientHeight: number): string =>
  `${Math.max(1, Math.round(clientHeight))}px`

/** Runs before the hero paints so the first frame already has its height. */
export const LANDING_VIEWPORT_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;if(d.getAttribute(${JSON.stringify(LANDING_VIEWPORT_WIDTH_ATTR)}))return;d.style.setProperty(${JSON.stringify(LANDING_VIEWPORT_HEIGHT_VAR)},Math.max(1,Math.round(d.clientHeight))+"px");d.setAttribute(${JSON.stringify(LANDING_VIEWPORT_WIDTH_ATTR)},String(d.clientWidth))}catch(e){}})()`
