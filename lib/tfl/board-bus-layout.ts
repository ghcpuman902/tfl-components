/**
 * Bus panel arrangement on wide boards. `stack` is one route under another;
 * `columns` puts routes two across, the odd one out wrapping underneath.
 *
 * Default: columns on a wide, short viewport (landscape, roughly ≥1024px and
 * wider than tall); stack on portrait and phone. `?busLayout=columns|stack`
 * overrides. Layout is decided from the URL and a media query before the
 * board paints panels (panels wait for hydration), so the first paint does
 * not flip.
 */
export type BusLayout = "stack" | "columns"

export const BUS_LAYOUT_PARAM = "busLayout"

/** Wide + landscape: iPad landscape and similar short boards. */
export const BUS_COLUMNS_MEDIA =
  "(min-width: 1024px) and (orientation: landscape)"

/**
 * Resolve the bus layout from an optional URL override and whether the
 * viewport is wide and short. Unknown params fall through to the default.
 */
export const resolveBusLayout = (
  param: string | null,
  landscapeWide: boolean
): BusLayout => {
  if (param === "columns") return "columns"
  if (param === "stack") return "stack"
  return landscapeWide ? "columns" : "stack"
}
