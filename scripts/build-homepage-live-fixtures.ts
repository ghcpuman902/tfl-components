/**
 * Trims the recorded TfL replays (`_agent/replays`, git-ignored) into one small
 * committed fixture for deterministic homepage tests and `?replay=` screenshots.
 *
 *   node --import tsx scripts/build-homepage-live-fixtures.ts
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import { brotliCompressSync, constants } from "node:zlib"
import { parseTflLineStrings } from "../lib/tfl/bus-route-geometry.ts"
import { mapStopPoint } from "../lib/tfl/bus-stop-shape.ts"

const ROOT = path.resolve(import.meta.dirname, "..")
const REPLAYS = path.join(ROOT, "_agent/replays")
const OUT = path.join(ROOT, "lib/tfl/fixtures/homepage-live")

const ROW_KEYS = [
  "vehicleId",
  "naptanId",
  "stationName",
  "lineId",
  "platformName",
  "direction",
  "destinationNaptanId",
  "destinationName",
  "currentLocation",
  "towards",
  "timeToStation",
  "expectedArrival",
  "timestamp",
  "modeName",
] as const

type Raw = Record<string, unknown> & { timing?: { read?: string } }

const trim = (row: Raw) => {
  const out: Record<string, unknown> = {}
  for (const key of ROW_KEYS) {
    const value = row[key]
    if (value !== undefined && value !== "" && value !== null) out[key] = value
  }
  if (row.timing?.read) out.read = row.timing.read
  return out
}

type Series = { receivedAt: number; rows: Record<string, unknown>[] }

const readSeries = (sub: string, keyOf: (name: string) => string | undefined) => {
  const dir = path.join(REPLAYS, "live", sub)
  const byKey = new Map<string, Series[]>()
  for (const file of readdirSync(dir).sort()) {
    const match = file.match(/^(.+Z)-(.+)\.json$/)
    const key = match && keyOf(match[2]!)
    if (!key) continue
    const env = JSON.parse(readFileSync(path.join(dir, file), "utf8")) as {
      receivedAt: string
      body: string
    }
    const rows = (JSON.parse(env.body) as Raw[]).map(trim)
    const list = byKey.get(key) ?? []
    list.push({ receivedAt: Date.parse(env.receivedAt), rows })
    byKey.set(key, list)
  }
  for (const list of byKey.values())
    list.sort((a, b) => a.receivedAt - b.receivedAt)
  return byKey
}

/** Align the per-endpoint polls into numbered 30 s rounds. */
const rounded = (byKey: Map<string, Series[]>) => {
  const t0 = Math.min(
    ...[...byKey.values()].map((list) => list[0]!.receivedAt)
  )
  const rounds = new Map<number, { receivedAt: number; rows: Record<string, Record<string, unknown>[]> }>()
  for (const [key, list] of byKey)
    for (const snap of list) {
      const n = Math.round((snap.receivedAt - t0) / 30000)
      const round = rounds.get(n) ?? { receivedAt: 0, rows: {} }
      round.receivedAt = Math.max(round.receivedAt, snap.receivedAt)
      round.rows[key] = snap.rows
      rounds.set(n, round)
    }
  return [...rounds.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r)
}

const arrivals = rounded(readSeries("arrivals", (name) => name))
const stopArrivals = rounded(
  readSeries("stop-arrivals", (name) => (name === "kx-tube" ? name : undefined))
)
const busArrivals = rounded(readSeries("bus-arrivals", (name) => name))

const fixture = {
  recordedAt: "2026-11-13T06:44Z",
  note: "Trimmed from live TfL recordings, one round every 30 s. receivedAt is the latest response in the round.",
  arrivals,
  stopArrivals,
  busArrivals,
}

mkdirSync(OUT, { recursive: true })

/** Recorded TfL place searches and the bus stops within 400 m of King's Cross, for search tests. */
const staticBody = (kind: string, name: string) => {
  const dir = path.join(REPLAYS, "static", kind)
  const file = readdirSync(dir).find((f) => f.endsWith(`-${name}.json`))
  if (!file) throw new Error(`missing ${kind}/${name}`)
  return JSON.parse(
    (JSON.parse(readFileSync(path.join(dir, file), "utf8")) as { body: string }).body
  ) as Record<string, unknown>
}
const searches: Record<string, unknown[]> = {}
for (const name of ["kings-cross", "tow", "angel", "euston-road"]) {
  const matches = (staticBody("search", name).matches ?? []) as Record<string, unknown>[]
  searches[name] = matches.map((m) => ({
    id: m.id,
    name: m.name,
    modes: m.modes,
    towards: m.towards,
    lat: m.lat,
    lon: m.lon,
  }))
}
const radius = (staticBody("stoppoint-radius", "kx-bus-400m").stopPoints ?? []) as Parameters<
  typeof mapStopPoint
>[0][]
const busRoutes: Record<string, number[][][]> = {}
const routeDir = path.join(REPLAYS, "static", "bus-route-sequence")
for (const file of readdirSync(routeDir)) {
  const match = file.match(/-(\w+)-(inbound|outbound)\.json$/)
  if (!match) continue
  const body = JSON.parse(
    (JSON.parse(readFileSync(path.join(routeDir, file), "utf8")) as { body: string }).body
  ) as { lineStrings?: string[] }
  busRoutes[`${match[1]}-${match[2]}`] = parseTflLineStrings(body.lineStrings ?? []).map(
    (line) =>
      line.coordinates.map(([lon, lat]) => [
        Math.round(lon! * 1e5) / 1e5,
        Math.round(lat! * 1e5) / 1e5,
      ])
  )
}
writeFileSync(
  path.join(OUT, "search.json"),
  JSON.stringify({
    searches,
    kxBusStops: radius.map((stop) => mapStopPoint(stop)).filter(Boolean),
    busRoutes,
  })
)
const json = JSON.stringify(fixture)
const packed = brotliCompressSync(Buffer.from(json), {
  params: {
    [constants.BROTLI_PARAM_QUALITY]: 11,
    [constants.BROTLI_PARAM_LGWIN]: 24,
    [constants.BROTLI_PARAM_SIZE_HINT]: json.length,
  },
})
writeFileSync(path.join(OUT, "rounds.json.br"), packed)
console.log(
  `rounds ${arrivals.length}; raw ${(json.length / 1e6).toFixed(1)} MB; brotli ${(packed.length / 1e6).toFixed(2)} MB`
)
