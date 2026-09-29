export const CROP_SCALE = 1.06

/** Matching landing-ipad case 125.7409×88.4773. */
export const IPAD_FRAME_ASPECT = 125.7409 / 88.4773

/** Side inset so the hero iPad does not kiss the viewport edge. */
export const HERO_SIDE_INSET = 0.04
export const HERO_TOP_INSET = "1rem"
/** Gap between the iPad and the headline block. */
export const HERO_COPY_GAP = "1.25rem"
/** Headline + continue control in the first-fold group. */
export const HERO_COPY_BAND = "8.5rem"
/** Nudge the iPad + copy group above geometric centre. */
export const HERO_GROUP_BIAS = "1.25rem"

/**
 * First-fold iPad: as large as the useful viewport allows, leaving the
 * copy band free. Same token at every width — height does the rest.
 */
export const IPAD_FRAME_WIDTH = `min(${(1 - HERO_SIDE_INSET * 2) * 100}vw, calc((100dvh - var(--site-header-height) - ${HERO_TOP_INSET} - ${HERO_COPY_GAP} - ${HERO_COPY_BAND}) * ${IPAD_FRAME_ASPECT}))`

/**
 * Pointer follow. L2 (iPad + mirror frame, 5 m) is the lock plane.
 * Shift ∝ 1/z − 1/5 from camera depths: sofa 1.5 m, front wall 4 m,
 * lamp 4.5 m (corridor centre), reflected wall 10 m.
 */
export const PARALLAX_X = {
  l0: 36,
  l1: 4,
  lamp: 2,
  l2: 0,
  l3: -8,
} as const

/** Desktop pointer follow on Y — same depth ratios as X, a little quieter. */
export const PARALLAX_Y = {
  l0: 24,
  l1: 3,
  lamp: 1,
  l2: 0,
  l3: -5,
} as const

/** Dolly uses the same inverse-depth ratios, with L2 locked. */
export const DOLLY_PARALLAX = {
  l0: 26,
  l1: 3,
  lamp: 1,
  l2: 0,
  l3: -6,
} as const

export const DOLLY_Y = {
  l0: 14,
  l1: 2,
  lamp: 1,
  l2: 0,
  l3: -3,
} as const

export const DOLLY_SCALE = {
  l0: 0.14,
  l1: 0.015,
  lamp: 0.007,
  l2: 0,
  l3: -0.03,
} as const

export const PHOTO_OVERLAY_WIDTH = 640

/**
 * One paper veil over the composited room. Light enough that the room
 * reads as a background, heavy enough that the iPad stays the subject.
 */
export const ROOM_VEIL_OPACITY = 0.7
export const ROOM_FADE_START = 0.04
export const ROOM_FADE_DURATION = 0.32
export const COPY_FADE_START = 0.04
export const COPY_FADE_DURATION = 0.28
/** Wall letterbox only after the room is already solid and framed. */
export const LETTERBOX_FADE_START = 0.78
export const LETTERBOX_FADE_DURATION = 0.22
export const ROOM_COMPLETE_AT = 0.98
/** Keep the room tall — never shrink past this to show the full width. */
export const ROOM_MIN_HEIGHT_FILL = 0.72
/** ViewBox padding around the iPad when panning the end crop. */
export const ROOM_IPAD_VIEW_MARGIN = 36
