/**
 * In-sentence / prose links.
 *
 * Stay `inline`. `inline-flex` + `items-center` lifts glyphs off the
 * surrounding alphabetic baseline: an SVG has no baseline, so the flex
 * box sits on its bottom edge and the text paints above the line.
 * `vertical-align` on icons is ignored inside a flex container.
 *
 * `inline-flex items-center` is for chrome (header, buttons, chips), not
 * running text. Chip optical centering (`CHIP_CAP_TEXT_BOX_CLASS`) is the
 * opposite job — do not put text-box trim on prose links.
 */
export const TEXT_LINK_CLASS = "inline align-baseline underline underline-offset-4"

/**
 * Leading or trailing icon in a prose link. Size follows the text; the
 * negative align drops the 1em box onto the x-height without moving the
 * host link off the line.
 */
export const TEXT_LINK_ICON_CLASS =
  "inline-block size-[1em] shrink-0 align-[-0.15em]"
