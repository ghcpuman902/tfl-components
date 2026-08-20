/**
 * Rank station/curvature viscosity params against a Central line trace
 * as if the live map only polled at 15 requests/min.
 *
 *   pnpm exec tsx scripts/tune-vehicle-viscosity.ts
 */
import { readFile } from "node:fs/promises"
import path from "node:path"
import {
  rankViscosityParams,
  type CentralVehicleTrace,
} from "@/lib/tfl/vehicle-viscosity-tune"

const tracePath = path.join(
  process.cwd(),
  "lib/tfl/fixtures/central-vehicle-trace.json"
)

const raw = await readFile(tracePath, "utf8")
const trace = JSON.parse(raw) as CentralVehicleTrace
if (!trace.frames?.length) {
  throw new Error(
    `No frames in ${tracePath}. Run scripts/capture-central-vehicles.ts first.`
  )
}

const ranked = rankViscosityParams(trace)
const winner = ranked[0]
const baseline = ranked.find(
  (row) =>
    row.params.dwellSec === 0 &&
    row.params.stationWeight === 0 &&
    row.params.stationApproachKm === 0
)

console.log(
  `${trace.frames.length} frames, ${trace.frames[0]?.rows.length ?? 0} vehicles at start`
)
console.log("baseline (no station viscosity)", baseline)
console.log("winner", winner)
console.log("top 5")
for (const row of ranked.slice(0, 5)) {
  console.log(
    `  err=${row.meanErrorM.toFixed(1)}m overshoot=${row.stationOvershootM.toFixed(1)} dwell=${row.params.dwellSec} approach=${row.params.stationApproachKm} weight=${row.params.stationWeight} curve=${row.params.curvatureWeight}`
  )
}
