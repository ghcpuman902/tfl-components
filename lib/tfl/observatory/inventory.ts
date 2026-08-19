import type {
  ObservatoryDirection,
  ObservatorySubjectKind,
} from "@/lib/tfl/observatory/types"

/**
 * Rail (and river) modes watched as hashed catalogues.
 * Bus and cycle hire are count-only checks against yesterday's last good count.
 */
export const OBSERVED_MODES = [
  "tube",
  "elizabeth-line",
  "dlr",
  "overground",
  "tram",
  "river-bus",
] as const

export type ObservedMode = (typeof OBSERVED_MODES)[number]

export const OBSERVED_MODE_SET: ReadonlySet<string> = new Set(OBSERVED_MODES)

export const LINE_CATALOGUE_SUBJECT_ID = "lines"

export const HISTORY_LIMIT = 2000
export const FETCH_CONCURRENCY = 4
export const OBSERVATORY_LOCK_TTL_SECONDS = 10 * 60
export const SMALL_SET_ITEM_FLOOR = 3
export const DRAMATIC_REDUCTION_RATIO = 0.5
export const MALFORMED_VALID_RATIO = 0.5

export const isObservedMode = (modeName: string | null | undefined): boolean =>
  OBSERVED_MODE_SET.has((modeName ?? "").trim().toLowerCase())

export const stopPointsSubjectId = (lineId: string): string => `stops:${lineId}`

export const routeSequenceSubjectId = (
  lineId: string,
  direction: ObservatoryDirection
): string => `route:${lineId}:${direction}`

export const datasetIdForKind = (
  kind: ObservatorySubjectKind
): "lines" | "stops" | "routes" => {
  if (kind === "line-catalogue") return "lines"
  if (kind === "stop-points") return "stops"
  return "routes"
}

export const formatLineLabel = (
  name: string | null | undefined,
  lineId: string,
  modeName?: string | null
): string => {
  const trimmed = (name ?? "").trim()
  const id = lineId.trim()
  const label = trimmed || id
  if (!label) return "unknown line"
  if (modeName === "river-bus") return label
  if (modeName === "dlr" || /^dlr$/i.test(label)) return "DLR"
  if (modeName === "tram" || /^tram/i.test(label)) return label
  if (/line$/i.test(label)) return label
  if (/\s/.test(label)) return label
  if (/^[A-Z]{0,2}\d/i.test(label) || label.includes("-")) return label
  return `${label} line`
}
