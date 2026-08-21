export const CROP_SCALE = 1.06

/** Matching landing-ipad case 125.7409×88.4773. */
export const IPAD_FRAME_ASPECT = 125.7409 / 88.4773

/** Side inset so the hero iPad does not kiss the viewport edge. */
export const HERO_SIDE_INSET = 0.04
export const HERO_TOP_INSET = "1rem"
/** Gap between the iPad and the headline block. */
export const HERO_COPY_GAP = "1.25rem"
/** Headline + continue control in the first-fold group. */
export const HERO_COPY_BAND = "6.5rem"
/** Nudge the iPad + copy group above geometric centre. */
export const HERO_GROUP_BIAS = "1.25rem"

/**
 * First-fold iPad: as large as the useful viewport allows, leaving the
 * copy band free. Same token at every width — height does the rest.
 */
export const IPAD_FRAME_WIDTH = `min(${(1 - HERO_SIDE_INSET * 2) * 100}vw, calc((100svh - var(--site-header-height) - ${HERO_TOP_INSET} - ${HERO_COPY_GAP} - ${HERO_COPY_BAND}) * ${IPAD_FRAME_ASPECT}))`

/**
 * Sticky stage is one viewport. Extra height is the pull-back so the
 * iPad can settle onto the table.
 */
export const PARALLAX_X = {
  l0: 28,
  l1: 15,
  l2: 6,
  l3: 1,
} as const

/** Scroll-driven depth, smaller than pointer parallax — a focal-length cue. */
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
