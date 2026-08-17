import { LINE_STATION_SEQUENCES } from "tfl-ts"

/** Live river-bus line ids from tfl-ts `LINE_STATION_SEQUENCES`. */
export const RIVER_BUS_LINE_IDS = Object.values(LINE_STATION_SEQUENCES)
  .filter((sequence) => sequence.modeName === "river-bus")
  .map((sequence) => sequence.lineId)
  .sort((a, b) => a.localeCompare(b, "en"))

export type RiverBusLineId = (typeof RIVER_BUS_LINE_IDS)[number]

export const RIVER_BUS_LINE_ID_SET: ReadonlySet<string> = new Set(
  RIVER_BUS_LINE_IDS,
)

export const FERRY_PORT_STOP_TYPE = "NaptanFerryPort"

/** Parent pier ids (`930G…`). Berths (`9300…`) return no arrivals. */
export const isFerryPortId = (id: string): boolean => /^930G/i.test(id.trim())

/** Trim, lower-case, spaces → hyphens. `"Woolwich Ferry"` → `woolwich-ferry`. */
export const canonicalRiverLineId = (lineId: string): string =>
  lineId.trim().toLowerCase().replace(/\s+/g, "-")

export const isRiverBusLineId = (lineId: string): boolean =>
  RIVER_BUS_LINE_ID_SET.has(canonicalRiverLineId(lineId))

export const filterRiverBusLineIds = (
  lineIds: readonly string[] | undefined,
): string[] =>
  [...new Set((lineIds ?? []).map(canonicalRiverLineId))].filter((id) =>
    RIVER_BUS_LINE_ID_SET.has(id),
  )

/** Keep only live river-bus predictions. Putney StopPoints also list bus routes. */
export const filterRiverBusArrivals = <T extends { lineId?: string }>(
  rows: readonly T[] | undefined,
): T[] => (rows ?? []).filter((row) => isRiverBusLineId(row.lineId ?? ""))

export const pointHasRiverBusLine = (
  lineIds: readonly string[] | undefined,
): boolean => (lineIds ?? []).some((id) => isRiverBusLineId(id))

/**
 * Chip paint vs accessible name. Woolwich Ferry does not fit 5ch.
 * `aria-label` is the full line name, not the abbreviated chip.
 */
export const riverRouteChipCopy = (
  lineId?: string,
  lineName?: string,
): { label: string; ariaLabel: string } => {
  const id = (lineId ?? "").trim().toLowerCase()
  const name = lineName?.trim()
  if (id === "woolwich-ferry") {
    return { label: "WF", ariaLabel: name || "Woolwich Ferry" }
  }
  const label = id ? id.toUpperCase() : (name ?? "")
  return { label, ariaLabel: name || label }
}
