import { cacheLife, cacheTag } from "next/cache"
import { LINE_STATION_SEQUENCES } from "tfl-ts"
import { getTflClient } from "@/lib/tfl/client"
import type { ExplorerRiverPoint } from "@/lib/tfl/explorer/common"
import { HOME_RIVER_STOP } from "@/lib/tfl/home-arrivals-stops"
import {
  RIVER_BUS_LINE_IDS,
  filterRiverBusLineIds,
  isFerryPortId,
} from "@/lib/tfl/river-bus"
import { mapFerryPort } from "@/lib/tfl/river-pier-shape"

const sortRiverPiers = (
  piers: ExplorerRiverPoint[]
): ExplorerRiverPoint[] => {
  const seedId = HOME_RIVER_STOP.id
  return [...piers].sort((a, b) => {
    if (a.id === seedId) return -1
    if (b.id === seedId) return 1
    return a.name.localeCompare(b.name, "en", { sensitivity: "base" })
  })
}

/**
 * Complete river-bus pier directory from tfl-ts `LINE_STATION_SEQUENCES`.
 * Offline topology — no TfL round-trip. Coords are filled later by the
 * cached `line.getStopPoints` enrichment.
 */
export const buildExplorerRiverPiersFromTopology = (): ExplorerRiverPoint[] => {
  const byId = new Map<string, ExplorerRiverPoint>()

  for (const sequence of Object.values(LINE_STATION_SEQUENCES)) {
    if (sequence.modeName !== "river-bus") continue
    for (const stop of sequence.stations) {
      const id = stop.id.trim()
      const name = stop.name.trim()
      if (!id || !name || !isFerryPortId(id)) continue
      const existing = byId.get(id)
      const lines = filterRiverBusLineIds([
        ...(existing?.lines ?? []),
        sequence.lineId,
      ])
      if (existing) {
        existing.lines = lines
        continue
      }
      byId.set(id, { id, name, lines })
    }
  }

  return sortRiverPiers([...byId.values()])
}

/**
 * Cached river-bus pier directory for Points / River.
 * Identity from offline topology; coords from `line.getStopPoints`.
 * Search / Locate filter this list locally — only arrivals are live.
 */
export async function getExplorerRiverPiers(): Promise<ExplorerRiverPoint[]> {
  "use cache"
  cacheLife({ revalidate: 300 })
  cacheTag("tfl-explorer-river-piers")

  const byId = new Map(
    buildExplorerRiverPiersFromTopology().map((pier) => [
      pier.id,
      { ...pier, lines: [...pier.lines] },
    ])
  )

  try {
    const client = getTflClient()
    const results = await Promise.all(
      RIVER_BUS_LINE_IDS.map((lineId) => client.line.getStopPoints(lineId))
    )

    for (const [index, stops] of results.entries()) {
      const lineId = RIVER_BUS_LINE_IDS[index]
      if (!lineId) continue
      for (const stop of stops) {
        const mapped = mapFerryPort(stop)
        if (!mapped) continue
        const lines = filterRiverBusLineIds([...mapped.lines, lineId])
        const existing = byId.get(mapped.id)
        if (existing) {
          existing.lines = filterRiverBusLineIds([...existing.lines, ...lines])
          existing.lat = existing.lat ?? mapped.lat
          existing.lon = existing.lon ?? mapped.lon
          continue
        }
        byId.set(mapped.id, {
          id: mapped.id,
          name: mapped.name,
          lat: mapped.lat,
          lon: mapped.lon,
          lines,
        })
      }
    }
  } catch {
    // Topology identity is enough for the list; map / locate skip missing coords.
  }

  return sortRiverPiers([...byId.values()])
}
