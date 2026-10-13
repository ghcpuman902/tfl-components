"use client"

import { useState } from "react"
import { getLineColor } from "tfl-ts"
import { LiveRailVehicles } from "@/components/tfl/live-vehicles/live-rail-vehicles"
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider"
import type { TargetRequestsPerMinute } from "@/lib/tfl/vehicle-poll-rate"
import { cn } from "@/lib/utils"

const RAIL_OPTIONS = [
  { id: "victoria", label: "Victoria" },
  { id: "northern", label: "Northern" },
  { id: "central", label: "Central" },
  { id: "jubilee", label: "Jubilee" },
  { id: "elizabeth", label: "Elizabeth" },
] as const

export default function LiveRailVehiclesDemo() {
  const { status } = useUserTflCredentials()
  const hasKey = status === "ready"
  const [railLineIds, setRailLineIds] = useState<string[]>(["victoria"])
  const [rate, setRate] = useState<TargetRequestsPerMinute>("max")

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Lines">
        {RAIL_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={railLineIds.includes(option.id)}
            onClick={() =>
              setRailLineIds((ids) =>
                ids.includes(option.id)
                  ? ids.filter((id) => id !== option.id)
                  : [...ids, option.id]
              )
            }
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm focus-visible:outline-2 focus-visible:outline-ring",
              railLineIds.includes(option.id)
                ? "border-foreground/20 bg-muted text-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted/60"
            )}
          >
            <span
              className="size-2 rounded-full"
              style={{ background: getLineColor(option.id).hex }}
            />
            {option.label}
          </button>
        ))}
      </div>
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
