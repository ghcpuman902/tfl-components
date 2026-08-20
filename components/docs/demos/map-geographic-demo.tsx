"use client"

import { useState } from "react"
import { TflGeographicMap } from "@/components/tfl/geography/tfl-geographic-map"
import type { TrackModel } from "@/lib/tfl/geography-types"
import { cn } from "@/lib/utils"

const TRACK_MODELS: { id: TrackModel; label: string }[] = [
  { id: "centreline", label: "Merged centreline" },
  { id: "dual", label: "Both tracks" },
]

export default function MapGeographicDemo() {
  const [trackModel, setTrackModel] = useState<TrackModel>("centreline")

  return (
    <div className="space-y-3">
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Track model"
      >
        {TRACK_MODELS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={trackModel === option.id}
            onClick={() => setTrackModel(option.id)}
            className={cn(
              "rounded-full border border-border px-2.5 py-1 text-xs",
              trackModel === option.id
                ? "bg-foreground text-background"
                : "bg-background text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="h-[min(70vh,32rem)] w-full overflow-hidden rounded-lg border border-border">
        <TflGeographicMap trackModel={trackModel} />
      </div>
      <p className="max-w-prose text-sm text-muted-foreground">
        Ship the merged centreline file for a map. Both tracks is the same
        corridors with each direction kept as its own polyline.
      </p>
    </div>
  )
}
