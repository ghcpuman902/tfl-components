"use client"

import { useEffect, useMemo, useState } from "react"
import { Pause, Play } from "lucide-react"
import { TflGeographicMap } from "@/components/tfl/geography/tfl-geographic-map"
import { Button } from "@/components/ui/button"
import type { VehiclePosition } from "@/lib/tfl/map-vehicles"
import { advanceTrainDisplay } from "@/lib/tfl/rail-train-tracker"
import { railPolylinesForLines } from "@/lib/tfl/rail-vehicle-geometry"
import { cn } from "@/lib/utils"

/** Central London, close enough that a Tube train is drawn at its true length. */
const CENTRAL_LONDON: [number, number] = [-0.128, 51.513]
const CENTRAL_ZOOM = 12.8

const usePrefersReducedMotion = () => {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduce(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])
  return reduce
}

/**
 * Live trains on the geographic Tube & Rail map. The map paints the track;
 * this places each train's carriages where the tracker estimates it is, and
 * keeps it moving between estimates.
 */
export const LiveTrainMap = ({
  lineIds,
  vehicles,
  className,
}: {
  lineIds: readonly string[]
  vehicles: readonly VehiclePosition[]
  className?: string
}) => {
  // While paused, the map keeps the same array, so trains stay where they are.
  const [frozen, setFrozen] = useState<readonly VehiclePosition[] | null>(null)
  const paused = frozen !== null
  const reduce = usePrefersReducedMotion()
  const lineIdsKey = lineIds.join(",")
  const polylines = useMemo(
    () => railPolylinesForLines(lineIdsKey ? lineIdsKey.split(",") : []),
    [lineIdsKey]
  )

  return (
    <div className={cn("space-y-2", className)}>
      <div className="h-[min(70vh,36rem)] min-h-80 w-full overflow-hidden rounded-lg border border-border">
        <TflGeographicMap
          vehicles={frozen ?? vehicles}
          vehiclePolylines={polylines}
          coast={!paused && !reduce}
          advanceVehicle={advanceTrainDisplay}
          center={CENTRAL_LONDON}
          zoom={CENTRAL_ZOOM}
          fitToLines={false}
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setFrozen(paused ? null : vehicles)}
        aria-pressed={paused}
      >
        {paused ? <Play /> : <Pause />}
        {paused ? "Resume" : "Pause"}
      </Button>
    </div>
  )
}
