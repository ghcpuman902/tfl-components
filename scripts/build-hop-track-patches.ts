/**
 * Cut track for hops that have no polyline in the unique-track data, from the
 * raw OSM relations in `data/geography/{mode}-geometry.json`. Writes
 * `data/geography/hop-track-patches.json`. No network.
 *
 *   node --import tsx scripts/build-hop-track-patches.ts
 */
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { cutHop, type LngLat } from "../lib/tfl/geometry/hop-track-patch.ts"
import {
  railHopPolylinesUnpatched,
  railModeForLineId,
  railStationsById,
} from "../lib/tfl/rail-vehicle-geometry.ts"
import { trainRoutes } from "../lib/tfl/rail-train-tracker.ts"
import { pickHopPolyline } from "../lib/tfl/vehicle-progress.ts"
import { hopGraphForRailLine } from "../lib/tfl/vehicle-hop-graph.ts"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const LINES = [
  "bakerloo", "central", "circle", "district", "hammersmith-city", "jubilee",
  "metropolitan", "northern", "piccadilly", "victoria", "waterloo-city",
  "dlr", "elizabeth", "liberty", "lioness", "mildmay", "suffragette", "weaver", "windrush", "tram",
]

type Feature = { properties?: { lineId?: string }; geometry?: { type: string; coordinates: unknown } }

const rawLines = new Map<string, LngLat[][]>()
const rawFor = (lineId: string): LngLat[][] => {
  const mode = railModeForLineId(lineId)
  const cacheKey = `${mode}:${lineId}`
  const hit = rawLines.get(cacheKey)
  if (hit) return hit
  const bundle = JSON.parse(
    readFileSync(path.join(ROOT, `data/geography/${mode}-geometry.json`), "utf8")
  ) as { lines?: { features?: Feature[] } }
  const lines = (bundle.lines?.features ?? [])
    .filter((f) => f.properties?.lineId === lineId)
    .flatMap((f) =>
      f.geometry?.type === "LineString"
        ? [f.geometry.coordinates as LngLat[]]
        : f.geometry?.type === "MultiLineString"
          ? (f.geometry.coordinates as LngLat[][])
          : []
    )
  rawLines.set(cacheKey, lines)
  return lines
}

const round = (n: number) => Math.round(n * 1e6) / 1e6
const coords = railStationsById()
const out: Record<string, { from: string; to: string; line: LngLat[] }[]> = {}
const report: string[] = []

for (const lineId of LINES) {
  const unpatched = railHopPolylinesUnpatched(lineId)
  const canonical = hopGraphForRailLine(lineId).canonical
  const seen = new Set<string>()
  let straight = 0
  let cut = 0
  for (const route of trainRoutes(lineId))
    for (let i = 1; i < route.stations.length; i++) {
      const from = route.stations[i - 1]!
      const to = route.stations[i]!
      const key = [canonical(from), canonical(to)].sort().join(">")
      if (seen.has(key)) continue
      seen.add(key)
      if (pickHopPolyline(unpatched, from, to, canonical)) continue
      straight++
      const a = coords.get(from)
      const b = coords.get(to)
      if (!a || !b) continue
      const patch = cutHop([a.lon, a.lat], [b.lon, b.lat], rawFor(lineId))
      if (!patch) continue
      cut++
      ;(out[lineId] ??= []).push({
        from,
        to,
        line: patch.line.map(([lon, lat]) => [round(lon), round(lat)] as LngLat),
      })
    }
  report.push(`${lineId.padEnd(18)} straight ${String(straight).padStart(3)}  cut ${String(cut).padStart(3)}`)
}

writeFileSync(
  path.join(ROOT, "data/geography/hop-track-patches.json"),
  `${JSON.stringify(out)}\n`
)
console.log(report.join("\n"))
