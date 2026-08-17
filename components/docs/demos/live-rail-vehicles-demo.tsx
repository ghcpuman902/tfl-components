"use client";

import { useState } from "react";
import { LiveRailVehicles } from "@/components/tfl/live-vehicles/live-rail-vehicles";
import { Checkbox } from "@/components/ui/checkbox";
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider";
import type { TargetRequestsPerMinute } from "@/lib/tfl/vehicle-poll-rate";
import { cn } from "@/lib/utils";

const RAIL_OPTIONS = [
  { id: "victoria", label: "Victoria" },
  { id: "northern", label: "Northern" },
  { id: "central", label: "Central" },
  { id: "jubilee", label: "Jubilee" },
  { id: "elizabeth", label: "Elizabeth" },
] as const;

const RATE_OPTIONS: { id: TargetRequestsPerMinute; label: string }[] = [
  { id: "max", label: "Max" },
  { id: 15, label: "15/min" },
  { id: 6, label: "6/min" },
  { id: 3, label: "3/min" },
];

const toggleId = (ids: string[], id: string): string[] =>
  ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];

export default function LiveRailVehiclesDemo() {
  const { status } = useUserTflCredentials();
  const hasKey = status === "ready";
  const [railLineIds, setRailLineIds] = useState<string[]>(["victoria"]);
  const [rate, setRate] = useState<TargetRequestsPerMinute>("max");

  return (
    <div className="space-y-4">
      <fieldset className="space-y-3 rounded-lg border border-border p-3">
        <legend className="px-1 text-sm font-medium">Lines</legend>
        <div className="flex flex-wrap gap-3">
          {RAIL_OPTIONS.map((option) => (
            <label key={option.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={railLineIds.includes(option.id)}
                onCheckedChange={() =>
                  setRailLineIds((ids) => toggleId(ids, option.id))
                }
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2 rounded-lg border border-border p-3">
        <legend className="px-1 text-sm font-medium">Refresh rate</legend>
        <div
          className={cn(
            "flex flex-wrap gap-2",
            !hasKey && "pointer-events-none opacity-50",
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
                  : "bg-background text-foreground",
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

      <LiveRailVehicles
        railLineIds={railLineIds}
        targetRequestsPerMinute={hasKey ? rate : "max"}
      />
    </div>
  );
}
