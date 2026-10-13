"use client"

import { useState } from "react"
import { BoardLineChipPicker } from "@/components/board/board-line-chip-picker"
import { LiveRailVehicles } from "@/components/tfl/live-vehicles/live-rail-vehicles"
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider"
import type { TargetRequestsPerMinute } from "@/lib/tfl/vehicle-poll-rate"

const RAIL_LINES = [
  { lineId: "victoria" },
  { lineId: "northern" },
  { lineId: "central" },
  { lineId: "jubilee" },
  { lineId: "elizabeth" },
] as const

const ALL_LINE_IDS = RAIL_LINES.map((line) => line.lineId)

export default function LiveRailVehiclesDemo() {
  const { status } = useUserTflCredentials()
  const hasKey = status === "ready"
  // One batched TfL request covers every selected line.
  const [railLineIds, setRailLineIds] = useState<readonly string[]>([
    "victoria",
    "northern",
    "central",
  ])
  const [rate, setRate] = useState<TargetRequestsPerMinute>("max")

  return (
    <div className="space-y-3">
      <BoardLineChipPicker
        lines={RAIL_LINES}
        selected={railLineIds}
        onChange={(next) => setRailLineIds(next ?? ALL_LINE_IDS)}
      />
      <LiveRailVehicles
        railLineIds={railLineIds}
        targetRequestsPerMinute={hasKey ? rate : "max"}
      />
      <details className="text-xs text-muted-foreground">
        <summary className="w-fit cursor-pointer py-2">Refresh rate</summary>
        {hasKey ? (
          <select
            aria-label="Refresh rate"
            value={rate}
            onChange={(event) =>
              setRate(
                event.target.value === "max"
                  ? "max"
                  : (Number(event.target.value) as TargetRequestsPerMinute)
              )
            }
            className="min-h-11 rounded-md border bg-background px-3 text-foreground"
          >
            <option value="max">Maximum</option>
            <option value="15">15/min</option>
            <option value="6">6/min</option>
            <option value="3">3/min</option>
          </select>
        ) : (
          <p className="pb-2">
            Add a TfL API key in the sidebar to choose a faster refresh rate.
          </p>
        )}
      </details>
    </div>
  )
}
