#!/usr/bin/env tsx
/**
 * Network-wide platformName survey across the subsurface lines (Circle,
 * District, Hammersmith & City, Metropolitan) to check whether "Inner Rail" /
 * "Outer Rail" wording is Paddington-specific, and to catalogue any other
 * platformName shapes that don't fit compass+platform / lettered / numbered /
 * "Platform Unknown".
 *
 * Diagnostic only — not part of the shipped app.
 *
 * Usage:
 *   set -a; source .env.local; set +a; npx tsx scripts/probe-platform-names.ts
 */
import { createRequire } from "node:module"
import { writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"

type ArrivalPrediction = {
  platformName?: string
  lineId?: string
}

type TflClientInstance = {
  stopPoint: {
    getArrivals: (opts: {
      stopPointIds: string[]
    }) => Promise<ArrivalPrediction[]>
  }
}

const require = createRequire(import.meta.url)
const tflTs = require("tfl-ts")
const TflClient = tflTs.default as new (opts?: {
  appKey?: string
}) => TflClientInstance
const LINE_STATION_SEQUENCES = tflTs.LINE_STATION_SEQUENCES as Record<
  string,
  { stations: { id: string; name: string }[] }
>

const client = new TflClient({ appKey: process.env.TFL_APP_KEY })

const SUBSURFACE_LINES = [
  "circle",
  "district",
  "hammersmith-city",
  "metropolitan",
]

const COMPASS_RE = /^(northbound|southbound|eastbound|westbound)\b/i
const PLAIN_PLATFORM_RE = /^platform\s+\d+$/i
const PLAIN_PLATFORM_LETTER_RE = /^[a-z]$/i

const classify = (platformName: string | undefined): string => {
  if (!platformName) return "(blank)"
  if (/\bunknown\b/i.test(platformName)) return "unknown"
  if (COMPASS_RE.test(platformName)) return "compass+platform"
  if (/rail/i.test(platformName))
    return "rail-designation (Inner/Outer Rail style)"
  if (PLAIN_PLATFORM_RE.test(platformName)) return "plain 'Platform N'"
  if (PLAIN_PLATFORM_LETTER_RE.test(platformName)) return "bare letter"
  return "OTHER"
}

const stationIds = new Map<string, string>()
for (const line of SUBSURFACE_LINES) {
  const seq = LINE_STATION_SEQUENCES[line]
  if (!seq) continue
  for (const station of seq.stations) {
    stationIds.set(station.id, station.name)
  }
}

console.log(
  `Querying ${stationIds.size} unique stations across ${SUBSURFACE_LINES.join(", ")}...`
)

type Finding = {
  stationId: string
  stationName: string
  platformName: string
  lineId?: string
  category: string
}

const findings: Finding[] = []
const categoryCounts = new Map<string, number>()
const otherOrRailExamples: Finding[] = []

const ids = [...stationIds.entries()]
for (let i = 0; i < ids.length; i++) {
  const [id, name] = ids[i]!
  try {
    const arrivals = await client.stopPoint.getArrivals({ stopPointIds: [id] })
    const seenPlatforms = new Set<string>()
    for (const a of arrivals) {
      const key = `${a.platformName ?? "(blank)"}`
      if (seenPlatforms.has(key)) continue
      seenPlatforms.add(key)
      const category = classify(a.platformName)
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1)
      const finding: Finding = {
        stationId: id,
        stationName: name,
        platformName: a.platformName,
        lineId: a.lineId,
        category,
      }
      findings.push(finding)
      if (category === "OTHER" || category.startsWith("rail-designation")) {
        otherOrRailExamples.push(finding)
      }
    }
  } catch (error) {
    console.error(`  ! ${id} (${name}) failed:`, (error as Error).message)
  }
  if ((i + 1) % 10 === 0) console.log(`  ...${i + 1}/${ids.length}`)
}

console.log("\n=== Category counts (distinct station+platformName pairs) ===")
for (const [category, count] of categoryCounts) {
  console.log(`  ${category}: ${count}`)
}

console.log("\n=== Rail-designation / OTHER examples ===")
for (const f of otherOrRailExamples) {
  console.log(
    `  [${f.category}] ${f.stationName} (${f.stationId}) | line=${f.lineId} | platformName="${f.platformName}"`
  )
}

const outDir = join(process.cwd(), "scratch", "arrivals-probe")
mkdirSync(outDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, "-")
writeFileSync(
  join(outDir, `${stamp}__platform-name-survey.json`),
  JSON.stringify({ stamp, findings }, null, 2)
)
console.log(
  `\nFull findings written to scratch/arrivals-probe/${stamp}__platform-name-survey.json`
)
