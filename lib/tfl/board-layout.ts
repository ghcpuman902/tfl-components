/**
 * Glance Board chrome helpers (safe-area gutters).
 * View mode itself is explicit only — see `view=glance` in board-settings.
 */

/** Safe-area + corner gutter padding for a filled wall / glance display. */
export const boardGlanceGutterCss = (
  minGutterPx = 20
): Record<string, string> => {
  const min = `${minGutterPx}px`
  return {
    paddingTop: `max(${min}, env(safe-area-inset-top, 0px))`,
    paddingRight: `max(${min}, env(safe-area-inset-right, 0px))`,
    paddingBottom: `max(${min}, env(safe-area-inset-bottom, 0px))`,
    paddingLeft: `max(${min}, env(safe-area-inset-left, 0px))`,
  }
}
