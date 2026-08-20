/**
 * 1-minute high-frequency Central line arrivals snapshot for viscosity
 * tuning. Writes lib/tfl/fixtures/central-vehicle-trace.json.
 *
 *   pnpm exec tsx --env-file=.env.local scripts/capture-central-vehicles.ts
 */
import { createRequire } from "node:module"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import type {
  CentralTraceFrame,
  CentralTraceRow,
  CentralVehicleTrace,
} from "@/lib/tfl/vehicle-viscosity-tune"

const require = createRequire(import.meta.url)
const tflTs = require("tfl-ts") as { default?: unknown }
const TflClient = tflTs.default as new (opts?: { appKey?: string }) => {
  line: {
    getArrivals: (query: { lineIds: string[] }) => Promise<
      {
        vehicleId?: string
        naptanId?: string
        timeToStation?: number
        destinationName?: string
        towards?: string
      }[]
    >
  }
}

const LINE_ID = "central"
const DURATION_MS = 60_000
const INTERVAL_MS = 1_000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const capture = async (): Promise<CentralVehicleTrace> => {
  const appKey = process.env.TFL_APP_KEY
  if (!appKey) {
    throw new Error("TFL_APP_KEY is required (use --env-file=.env.local).")
  }
  const client = new TflClient({ appKey })
  const started = Date.now()
  const frames: CentralTraceFrame[] = []

  while (Date.now() - started < DURATION_MS) {
    const tickStart = Date.now()
    const arrivals = await client.line.getArrivals({ lineIds: [LINE_ID] })
    const byVehicle = new Map<string, CentralTraceRow>()
    for (const arrival of arrivals) {
      const vehicleId = arrival.vehicleId?.trim()
      const naptanId = arrival.naptanId?.trim()
      if (!vehicleId || !naptanId) continue
      const timeToStation = arrival.timeToStation ?? 0
      const existing = byVehicle.get(vehicleId)
      if (existing && existing.timeToStation <= timeToStation) continue
      byVehicle.set(vehicleId, {
        vehicleId,
        naptanId,
        timeToStation,
        destinationName: arrival.destinationName ?? arrival.towards ?? "",
      })
    }
    frames.push({ fetchedAt: Date.now(), rows: [...byVehicle.values()] })
    process.stderr.write(
      `\rcaptured ${frames.length} frames / ${byVehicle.size} vehicles`
    )
    const wait = INTERVAL_MS - (Date.now() - tickStart)
    if (wait > 0 && Date.now() - started < DURATION_MS) await sleep(wait)
  }

  process.stderr.write("\n")
  return {
    lineId: LINE_ID,
    intervalMs: INTERVAL_MS,
    startedAt: new Date(started).toISOString(),
    frames,
  }
}

const outPath = path.join(
  process.cwd(),
  "lib/tfl/fixtures/central-vehicle-trace.json"
)

const trace = await capture()
await mkdir(path.dirname(outPath), { recursive: true })
await writeFile(outPath, `${JSON.stringify(trace)}\n`)
process.stderr.write(`wrote ${trace.frames.length} frames to ${outPath}\n`)
