/**
 * Minimal shape of `client.stopPoint.getDisruption` / `getDisruptionByMode`
 * results. Kept decoupled from `tfl-ts`'s generated type so this file (and
 * its tests) don't need the SDK to construct fixtures.
 */
export type RawBusStopDisruption = {
  description?: string
  concernedLines?: readonly { id?: string }[]
}

export type BusStopDisruption = {
  /** Route code as painted on `BusNumberChip` (e.g. `"158"`). */
  lineId: string
  /** Human-readable disruption text, cleaned of embedded newlines. */
  description: string
}

const ROUTE_MENTION = /route\s+([a-z0-9]{1,4})\b/i
const RIVER_LINE_MENTION = /\b(rb[146]|woolwich[\s-]?ferry)\b/i

/**
 * Keep bus route codes as TfL painted them (`N22`). Canonicalise river ids
 * so `RB1` / `Woolwich Ferry` match `isRiverBusLineId` and the river chip.
 */
const normaliseDisruptionLineId = (raw: string): string => {
  const trimmed = raw.trim()
  const id = trimmed.toLowerCase()
  if (/^woolwich[\s-]?ferry$/.test(id) || id === "wf") return "woolwich-ferry"
  if (/^rb[146]$/.test(id)) return id
  return trimmed
}

/**
 * TfL's free-text disruption copy wraps lines with a literal `\n` — two
 * plain characters (backslash + "n"), not a real newline — plus occasional
 * real whitespace. Collapse both into single spaces.
 */
const cleanDescription = (raw: string | undefined): string =>
  (raw ?? "")
    .replace(/\\+n/g, " ")
    .replace(/\s+/g, " ")
    .trim()

/**
 * Normalise stop-point disruptions into per-route warnings a bus board can
 * paint. Empirically (checked against live TfL data), `concernedLines` is
 * almost never populated for bus closures — the affected route, when named
 * at all, only appears in the free-text `description` (e.g. "Route 164 is
 * on diversion…"). Two real shapes follow from that:
 *
 * - Route-specific: attach the warning to that one route, even when `rows`
 *   has zero arrivals for it. A diverted route often vanishes from
 *   predictions entirely at this stop — that disappearance is exactly what
 *   is worth flagging, not just routes still visibly running.
 * - Stop-wide ("Bus Stop Closed", no route named): the whole physical stop
 *   is affected, so the same text applies to every route currently in
 *   `rows` — no route there is more or less affected than another.
 *
 * River piers use the same `DisruptedPoint` payload. Mentions look like
 * `RB1` or `Woolwich Ferry` rather than `Route 164`; a pier-wide closure
 * still fans out to every river route in `rows`.
 */
export const prepareBusStopDisruptions = (
  disruptions: readonly RawBusStopDisruption[],
  rows: readonly { lineName?: string }[]
): readonly BusStopDisruption[] => {
  const knownRoutes = [
    ...new Set(
      rows
        .map((row) => row.lineName?.trim())
        .filter((name): name is string => Boolean(name))
    ),
  ]

  const byLineId = new Map<string, string>()

  for (const disruption of disruptions) {
    const description = cleanDescription(disruption.description)
    if (!description) continue

    const concerned = (disruption.concernedLines ?? [])
      .map((line) => line.id?.trim())
      .filter((id): id is string => Boolean(id))

    const mentioned =
      description.match(ROUTE_MENTION)?.[1] ??
      description.match(RIVER_LINE_MENTION)?.[1]

    const lineIds = (
      concerned.length > 0 ? concerned : mentioned ? [mentioned] : knownRoutes
    ).map(normaliseDisruptionLineId)

    for (const lineId of lineIds) {
      if (!byLineId.has(lineId)) byLineId.set(lineId, description)
    }
  }

  return [...byLineId.entries()].map(([lineId, description]) => ({
    lineId,
    description,
  }))
}
