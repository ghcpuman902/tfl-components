import { LINE_ORDER, normalizeLineId } from "tfl-ts";

/**
 * Canonical Tube & Rail line rank from `tfl-ts` `LINE_ORDER`.
 * Unknown ids sort after known lines (stable tail).
 */
export const arrivalsLineOrderKey = (lineId: string): number => {
  const index = LINE_ORDER.indexOf(normalizeLineId(lineId));
  return index === -1 ? LINE_ORDER.length : index;
};

export type ArrivalsLineSortable = {
  lineId: string;
  lineName: string;
  /** When true, prefer route-name sort over `LINE_ORDER`. */
  bus?: boolean;
  /** False when the line/route has no predictions to show. */
  hasInformation: boolean;
};

/**
 * Stable board order: lines with arrivals first, then empty lines; within each
 * bucket use `LINE_ORDER` (rail) or natural route name (bus). Does **not** sort
 * by soonest train — that caused rows to jump on every refresh.
 */
export const compareArrivalsLines = (
  a: ArrivalsLineSortable,
  b: ArrivalsLineSortable,
): number => {
  const infoDiff = Number(b.hasInformation) - Number(a.hasInformation);
  if (infoDiff !== 0) return infoDiff;

  const aBus = a.bus === true;
  const bBus = b.bus === true;
  if (!aBus && !bBus) {
    const orderDiff =
      arrivalsLineOrderKey(a.lineId) - arrivalsLineOrderKey(b.lineId);
    if (orderDiff !== 0) return orderDiff;
  }

  return a.lineName.localeCompare(b.lineName, "en", {
    numeric: true,
    sensitivity: "base",
  });
};
