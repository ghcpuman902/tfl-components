/**
 * Stable natural route order for grouped bus boards (9 before 18 before 205).
 */

export const compareBusRouteNames = (a: string, b: string): number =>
  a.localeCompare(b, "en", { numeric: true, sensitivity: "base" })
