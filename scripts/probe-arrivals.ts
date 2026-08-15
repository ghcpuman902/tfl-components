#!/usr/bin/env tsx
/**
 * Diagnostic probe for the Paddington / Liverpool Street arrivals
 * investigation (District+Circle+H&C grouping, Inner/Outer Rail platform
 * naming, and the "destination == this station" rows on Elizabeth line /
 * Weaver). Not part of the shipped app — rerun manually to gather more
 * samples across different times of day / days of week before deciding on
 * any board behaviour change.
 *
 * Usage:
 *   set -a; source .env.local; set +a; npx tsx scripts/probe-arrivals.ts
 *
 * Each run appends one timestamped JSON snapshot per stop to
 * `scratch/arrivals-probe/` (gitignored) and prints a compact summary table
 * so snapshots can be eyeballed and diffed over time.
 */
import { createRequire } from "node:module"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const require = createRequire(import.meta.url)
const TflClient = require("tfl-ts").default as new (opts?: {
  appKey?: string
}) => any
const client = new TflClient({ appKey: process.env.TFL_APP_KEY })

const OUT_DIR = join(process.cwd(), "scratch", "arrivals-probe")
mkdirSync(OUT_DIR, { recursive: true })

const STOPS: { label: string; stopId: string; selfIds: string[] }[] = [
  {
    label: "Paddington (Circle/District)",
    stopId: "940GZZLUPAC",
    selfIds: ["940GZZLUPAC"],
  },
  {
    label: "Paddington (H&C branch)",
    stopId: "940GZZLUPAH",
    selfIds: ["940GZZLUPAH"],
  },
  {
    label: "Paddington (Elizabeth line)",
    stopId: "910GPADTLL",
    // Hub siblings: low-level Elizabeth platforms + mainline platforms.
    selfIds: ["910GPADTLL", "910GPADTON"],
  },
  {
    label: "Liverpool Street (tube)",
    stopId: "940GZZLULVT",
    selfIds: ["940GZZLULVT"],
  },
  {
    label: "Liverpool Street (Elizabeth + Weaver)",
    stopId: "910GLIVST",
    selfIds: ["910GLIVST"],
  },
]

type Row = {
  lineId?: string
  lineName?: string
  platformName?: string
  direction?: string
  towards?: string
  destinationName?: string
  destinationNaptanId?: string
  currentLocation?: string
  vehicleId?: string
  timeToStation?: number
  expectedArrival?: string
  timeToLive?: string
  modeName?: string
  isSelfDestination: boolean
  /** timeToLive minus expectedArrival, seconds. Large negative = stale-by-design. */
  timeToLiveDeltaSec: number | null
}

const toRow = (a: any, selfIds: string[]): Row => {
  const isSelfDestination = Boolean(
    a.destinationNaptanId && selfIds.includes(a.destinationNaptanId)
  )
  let timeToLiveDeltaSec: number | null = null
  if (a.timeToLive && a.expectedArrival) {
    timeToLiveDeltaSec = Math.round(
      (new Date(a.timeToLive).getTime() - new Date(a.expectedArrival).getTime()) /
        1000
    )
  }
  return {
    lineId: a.lineId,
    lineName: a.lineName,
    platformName: a.platformName,
    direction: a.direction,
    towards: a.towards,
    destinationName: a.destinationName,
    destinationNaptanId: a.destinationNaptanId,
    currentLocation: a.currentLocation,
    vehicleId: a.vehicleId,
    timeToStation: a.timeToStation,
    expectedArrival: a.expectedArrival,
    timeToLive: a.timeToLive,
    modeName: a.modeName,
    isSelfDestination,
    timeToLiveDeltaSec,
  }
}

const dump = async (
  runStamp: string,
  label: string,
  stopId: string,
  selfIds: string[]
) => {
  console.log(`\n===== ${label} (${stopId}) =====`)
  const arrivals = (await client.stopPoint.getArrivals({
    stopPointIds: [stopId],
  })) as any[]
  const rows = arrivals
    .map((a) => toRow(a, selfIds))
    .sort((a, b) => (a.timeToStation ?? 0) - (b.timeToStation ?? 0))

  console.log(`rows: ${rows.length}`)
  for (const r of rows) {
    const flag = r.isSelfDestination ? " <-- SELF-DESTINATION" : ""
    console.log(
      `  ${r.lineId} | platform=${r.platformName} | dir=${r.direction || "-"} | ` +
        `dest=${r.destinationName || r.towards || "-"} | loc=${
          r.currentLocation || "-"
        } | ttsMin=${
          r.timeToStation != null ? (r.timeToStation / 60).toFixed(1) : "?"
        } | ttlDeltaSec=${r.timeToLiveDeltaSec ?? "?"}${flag}`
    )
  }

  const selfCount = rows.filter((r) => r.isSelfDestination).length
  if (selfCount > 0) {
    const deltas = rows
      .filter((r) => r.isSelfDestination && r.timeToLiveDeltaSec != null)
      .map((r) => r.timeToLiveDeltaSec as number)
    console.log(
      `  -> ${selfCount} self-destination row(s); timeToLive-expectedArrival delta range: ` +
        `${Math.min(...deltas)}s .. ${Math.max(...deltas)}s`
    )
  }

  const file = join(OUT_DIR, `${runStamp}__${stopId}.json`)
  writeFileSync(file, JSON.stringify({ label, stopId, fetchedAt: runStamp, rows }, null, 2))
}

const main = async () => {
  const runStamp = new Date().toISOString().replace(/[:.]/g, "-")
  console.log(`Probe run: ${runStamp}`)
  for (const stop of STOPS) {
    await dump(runStamp, stop.label, stop.stopId, stop.selfIds)
  }
  console.log(`\nSnapshots written to ${OUT_DIR}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
