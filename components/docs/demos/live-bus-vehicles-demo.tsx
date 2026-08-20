"use client"

import { useState } from "react"
import { LiveBusVehicles } from "@/components/tfl/live-vehicles/live-bus-vehicles"
import { Checkbox } from "@/components/ui/checkbox"
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider"
import type { BusPositionSource } from "@/lib/tfl/bods-siri-vm"
import type { TargetRequestsPerMinute } from "@/lib/tfl/vehicle-poll-rate"
import { cn } from "@/lib/utils"

const BUS_OPTIONS = [
  { id: "24", label: "24" },
  { id: "29", label: "29" },
  { id: "73", label: "73" },
] as const

const RATE_OPTIONS: { id: TargetRequestsPerMinute; label: string }[] = [
  { id: "max", label: "Max" },
  { id: 15, label: "15/min" },
  { id: 6, label: "6/min" },
  { id: 3, label: "3/min" },
]

const toggleId = (ids: string[], id: string): string[] =>
  ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]

export default function LiveBusVehiclesDemo() {
  const { status } = useUserTflCredentials()
  const hasKey = status === "ready"
  const [busRouteIds, setBusRouteIds] = useState<string[]>(["24"])
  const [rate, setRate] = useState<TargetRequestsPerMinute>("max")
  const [busSource, setBusSource] = useState<BusPositionSource>("auto")

  return (
    <div className="space-y-4">
      <fieldset className="space-y-3 rounded-lg border border-border p-3">
        <legend className="px-1 text-sm font-medium">Routes</legend>
        <div className="flex flex-wrap gap-3">
          {BUS_OPTIONS.map((option) => (
            <label key={option.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={busRouteIds.includes(option.id)}
                onCheckedChange={() =>
                  setBusRouteIds((ids) => toggleId(ids, option.id))
                }
              />
              Route {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2 rounded-lg border border-border p-3">
        <legend className="px-1 text-sm font-medium">Refresh rate</legend>
        <div
          className={cn(
            "flex flex-wrap gap-2",
            !hasKey && "pointer-events-none opacity-50"
          )}
        >
          {RATE_OPTIONS.map((option) => (
            <button
              key={String(option.id)}
              type="button"
              disabled={!hasKey}
              aria-pressed={rate === option.id}
              onClick={() => setRate(option.id)}
              className={cn(
                "rounded-full border border-border px-2.5 py-1 text-xs",
                rate === option.id
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {!hasKey ? (
          <p className="text-xs text-muted-foreground">
            Add a TfL API key in the sidebar to choose a faster refresh rate.
          </p>
        ) : null}
      </fieldset>

      <fieldset className="space-y-2 rounded-lg border border-border p-3">
        <legend className="px-1 text-sm font-medium">Position source</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["auto", "Auto"],
              ["dead-reckoning", "Arrivals"],
              ["gps", "GPS"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={busSource === id}
              onClick={() => setBusSource(id)}
              className={cn(
                "rounded-full border border-border px-2.5 py-1 text-xs",
                busSource === id
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          GPS needs a DfT BODS API key. Arrivals interpolates from countdowns.
        </p>
      </fieldset>

      <LiveBusVehicles
        busRouteIds={busRouteIds}
        targetRequestsPerMinute={hasKey ? rate : "max"}
        busPositionSource={busSource}
      />
    </div>
  )
}
