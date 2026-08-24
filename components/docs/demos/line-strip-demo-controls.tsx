"use client"

import { useMemo, useState, type ChangeEvent } from "react"
import { LineStrip } from "@/components/tfl/diagram/line-strip"
import type { StripLabelPlacement } from "@/lib/tfl/strip-model"
import type { DiagramSegment, DiagramStation } from "@/lib/tfl/diagram-station"
import { cn } from "@/lib/utils"

export type LiveStripRoute = {
  lineId: string
  lineName: string
  lineColor: string
  stations: DiagramStation[]
  routeError?: string
}

type LiveProps = {
  routes: LiveStripRoute[]
  defaultLineId?: string
}

export const LiveLineStripPicker = ({
  routes,
  defaultLineId = "victoria",
}: LiveProps) => {
  const initial =
    routes.find((r) => r.lineId === defaultLineId)?.lineId ??
    routes[0]?.lineId ??
    defaultLineId
  const [lineId, setLineId] = useState(initial)

  const route = useMemo(
    () => routes.find((r) => r.lineId === lineId) ?? routes[0],
    [lineId, routes]
  )

  if (!route) {
    return (
      <p className="text-sm text-muted-foreground">No live routes available.</p>
    )
  }

  const handleLineChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setLineId(event.target.value)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Line</span>
          <select
            id="live-line-strip-picker"
            name="live-line"
            className="min-h-10 rounded-md border border-border bg-background px-3 py-2 text-base"
            value={route.lineId}
            onChange={handleLineChange}
            aria-label="Select live line"
          >
            {routes.map((r) => (
              <option key={r.lineId} value={r.lineId}>
                {r.lineName}
              </option>
            ))}
          </select>
        </label>
        {route.routeError ? (
          <p className="text-sm text-muted-foreground">{route.routeError}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {route.stations.length} stops · live sequence
          </p>
        )}
      </div>

      {route.stations.length > 0 ? (
        <LineStrip
          lineId={route.lineId}
          stations={route.stations}
          lineColor={route.lineColor}
          lineName={route.lineName}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          No outbound spine available for this line.
        </p>
      )}
    </div>
  )
}

/** @deprecated Prefer `LiveLineStripPicker`. */
export const LiveHorizontalLinePicker = LiveLineStripPicker

type PlacementProps = {
  stations: DiagramStation[]
  lineColor: string
  lineName: string
  lineId?: string
}

export const LabelPlacementDemo = ({
  stations,
  lineColor,
  lineName,
  lineId = "victoria",
}: PlacementProps) => {
  const [placement, setPlacement] = useState<StripLabelPlacement>("above")

  const options: { id: StripLabelPlacement; label: string }[] = [
    { id: "above", label: "Above" },
    { id: "below", label: "Below" },
    { id: "alternate", label: "Alternate" },
  ]

  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label="Label placement"
        className="flex flex-wrap gap-2"
      >
        {options.map((option) => {
          const selected = placement === option.id
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setPlacement(option.id)}
              className={cn(
                "min-h-10 rounded-md px-3 py-2 text-sm transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                selected
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-foreground hover:bg-muted"
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <LineStrip
        lineId={lineId}
        stations={stations}
        lineColor={lineColor}
        lineName={lineName}
        labelPlacement={placement}
      />
    </div>
  )
}

type ClosureProps = {
  stations: DiagramStation[]
  lineColor: string
  lineName: string
  segments: DiagramSegment[]
  lineId?: string
}

export const PartClosureDemo = ({
  stations,
  lineColor,
  lineName,
  segments,
  lineId = "victoria",
}: ClosureProps) => (
  <LineStrip
    lineId={lineId}
    stations={stations}
    lineColor={lineColor}
    lineName={lineName}
    segments={segments}
  />
)
