import { Bike } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types"
import {
  CYCLE_HIRE_BIKE,
  CYCLE_HIRE_EBIKE,
} from "@/components/tfl/cycle-hire/cycle-hire-colours"

export type { CycleHireDock } from "@/lib/tfl/cycle-hire-types"

export type DockCounts = {
  eBikes: number
  standardBikes: number
  brokenDocks: number
  emptyDocks: number
  totalDocks: number
  availableBikes: number
}

export const getDockCounts = (dock: CycleHireDock): DockCounts => {
  const totalDocks = Math.max(0, dock.docks)
  const eBikes = Math.max(0, dock.eBikes ?? 0)
  const standardBikes = Math.max(
    0,
    dock.standardBikes ?? Math.max(0, dock.bikes - eBikes)
  )
  const brokenDocks = Math.max(0, dock.brokenDocks)
  const emptyDocks = Math.max(
    0,
    dock.spaces ??
      Math.max(0, totalDocks - eBikes - standardBikes - brokenDocks)
  )
  return {
    eBikes,
    standardBikes,
    brokenDocks,
    emptyDocks,
    totalDocks,
    availableBikes: eBikes + standardBikes,
  }
}

type MarkerProps = {
  dock: CycleHireDock
  className?: string
  size?: number
}

/**
 * Map-style dock marker — ring gauge for bike / e-bike / space, Lucide bike in the centre.
 * Broken docks are omitted (map glance info only).
 */
export const CycleHireDockMarker = ({
  dock,
  className,
  size = 56,
}: MarkerProps) => {
  const { standardBikes, eBikes, emptyDocks } = getDockCounts(dock)
  const total = standardBikes + eBikes + emptyDocks

  const strokeWidth = Math.max(5, Math.round(size * 0.12))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const centre = size / 2

  const arcs =
    total === 0
      ? []
      : (
          [
            {
              kind: "standard" as const,
              count: standardBikes,
              colour: CYCLE_HIRE_BIKE,
            },
            { kind: "eBike" as const, count: eBikes, colour: CYCLE_HIRE_EBIKE },
            {
              kind: "empty" as const,
              count: emptyDocks,
              colour: "var(--muted-foreground)",
            },
          ] as const
        ).filter((arc) => arc.count > 0)

  let offset = 0

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        total === 0
          ? `${dock.name}: no docks reported`
          : `${dock.name}: ${standardBikes} bikes, ${eBikes} e-bikes, ${emptyDocks} spaces`
      }
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
        aria-hidden
      >
        {total === 0 ? (
          <circle
            cx={centre}
            cy={centre}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted"
          />
        ) : (
          arcs.map((arc) => {
            const length = (arc.count / total) * circumference
            const dashOffset = -offset
            offset += length
            return (
              <circle
                key={arc.kind}
                cx={centre}
                cy={centre}
                r={radius}
                fill="none"
                stroke={arc.colour}
                strokeWidth={strokeWidth}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${centre} ${centre})`}
                opacity={arc.kind === "empty" ? 0.35 : 1}
              />
            )
          })
        )}
        <circle
          cx={centre}
          cy={centre}
          r={radius - strokeWidth / 2 - 1}
          className="fill-background"
        />
      </svg>
      <Bike
        className="absolute top-1/2 left-1/2 size-[45%] -translate-x-1/2 -translate-y-1/2 text-foreground"
        strokeWidth={2}
        aria-hidden
      />
    </div>
  )
}
