/**
 * Bus panel arrangement on wide boards. `stack` is one route under another;
 * `columns` puts routes two across, the odd one out wrapping underneath.
 * `?busLayout=columns` picks it to compare on one build; production stacks.
 */
export type BusLayout = "stack" | "columns"

export const BUS_LAYOUT_PARAM = "busLayout"

export const parseBusLayout = (
  param: string | null,
  dev: boolean
): BusLayout => (dev && param === "columns" ? "columns" : "stack")
