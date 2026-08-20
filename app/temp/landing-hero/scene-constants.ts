export const CROP_SCALE = 1.06
export const IPAD_PADDING_FRACTION = 0.08
/** Long page runway after the zoom so the rest of the landing can keep scrolling. */
export const HERO_SCROLL_HEIGHT = "220svh"

/**
 * Fraction of the hero scroll range that owns the camera.
 * After this, the iPad stays zoomed and the page just continues.
 */
export const ZOOM_SCROLL_FRACTION = 0.14
/** Fraction of the zoom slice that commits — iOS paging, biased early. */
export const COMMIT_THRESHOLD = 0.1
/** iOS settle: ease-out only. Never in-out (that restarts acceleration). */
export const SETTLE_DURATION_MIN = 0.42
export const SETTLE_DURATION_MAX = 0.55
export const SETTLE_EASE = "power3.out"
export const SNAP_DELAY = 0.04
export const CLICK_SETTLE_DURATION = 0.55
export const CLICK_SETTLE_EASE = "power3.out"

export const PARALLAX_X = {
  l0: 28,
  l1: 15,
  l2: 6,
  l3: 1,
} as const

/** Scroll-driven depth, smaller than pointer parallax — a focal-length cue, not a second zoom. */
export const DOLLY_PARALLAX = {
  l0: 10,
  l1: 5,
  l2: 2,
  l3: 0.3,
} as const

export const DOLLY_SCALE = {
  l0: 0.04,
  l1: 0.022,
  l2: 0.01,
  l3: 0.003,
} as const

export const PHOTO_OVERLAY_WIDTH = 640

export const DEFOCUS = {
  l0: { blur: 14, opacity: 0.15, duration: 0.5, start: 0 },
  l1: { blur: 8, opacity: 0.4, duration: 0.45, start: 0.18 },
} as const

export const COPY_FADE_DURATION = 0.32
export const CAPTION_FADE_START = 0.75
export const CAPTION_FADE_DURATION = 0.25
export const ZOOM_COMPLETE_AT = 0.98
