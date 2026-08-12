import { LINE_ORDER, normalizeLineId } from "tfl-ts"

/**
 * Canonical Tube & Rail line rank from `tfl-ts` `LINE_ORDER`.
 * Unknown ids sort after known lines (stable tail).
 */
export const arrivalsLineOrderKey = (lineId: string): number => {
  const index = LINE_ORDER.indexOf(normalizeLineId(lineId))
  return index === -1 ? LINE_ORDER.length : index
}

export type ArrivalsLineSortable = {
  lineId: string
  lineName: string
}

/**
 * Canonical rail line order. Empty lines keep their `LINE_ORDER` slot;
 * this does not move them below live lines, and does not sort by soonest train.
 */
export const compareArrivalsLines = (
  a: ArrivalsLineSortable,
  b: ArrivalsLineSortable
): number => {
  const orderDiff =
    arrivalsLineOrderKey(a.lineId) - arrivalsLineOrderKey(b.lineId)
  if (orderDiff !== 0) return orderDiff

  return a.lineName.localeCompare(b.lineName, "en", {
    numeric: true,
    sensitivity: "base",
  })
}
