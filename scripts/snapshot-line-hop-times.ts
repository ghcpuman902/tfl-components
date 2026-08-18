/**
 * Fetch TfL hop travel times once and write them to disk.
 *
 *   pnpm hop-times:snapshot
 *
 * Reads TFL_APP_KEY from the environment or `.env.local`.
 */
import { createRequire } from "node:module"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { fetchLineHopTimes } from "../lib/tfl/geometry/line-hop-times-data.ts"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "data/geography/line-hop-times.json")

const loadAppKey = async () => {
  if (process.env.TFL_APP_KEY) return
  try {
    const text = await readFile(path.join(ROOT, ".env.local"), "utf8")
    for (const line of text.split("\n")) {
      if (!line.startsWith("TFL_APP_KEY=")) continue
      process.env.TFL_APP_KEY = line.slice("TFL_APP_KEY=".length).trim()
      return
    }
  } catch {
    // keep going; tfl-ts can still try an unauthenticated request
  }
}

const log = (message: string) => {
  console.log(message)
}

await loadAppKey()
const require = createRequire(import.meta.url)
const tflTs = require("tfl-ts") as { default?: unknown }
const TflClient = tflTs.default as new (opts?: { appKey?: string }) => {
  line: {
    getTimetable: (query: {
      id: string
      fromStopPointId: string
    }) => Promise<{ timetable?: { departureStopId?: string } }>
  }
  journey: {
    plan: (query: {
      from: string
      to: string
      mode: string[]
      journeyPreference: "LeastTime"
    }) => Promise<{ journeys?: { duration?: number }[] }>
  }
}
const client = new TflClient({ appKey: process.env.TFL_APP_KEY })
log("Fetching TfL hop travel times…")
const snapshot = await fetchLineHopTimes(client)
const lines = Object.values(snapshot.lines)
const hopCount = lines.reduce((sum, line) => sum + line.timedHopCount, 0)
await writeFile(OUT, `${JSON.stringify(snapshot, null, 2)}\n`)
log(
  `Wrote ${path.relative(ROOT, OUT)} · ${lines.length} lines · ${hopCount} hops · ${snapshot.fetchedAt}`
)
