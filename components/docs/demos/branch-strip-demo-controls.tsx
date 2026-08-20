"use client"

import { useMemo, useState, type ChangeEvent } from "react"
import { LineStrip } from "@/components/tfl/diagram/line-strip"
import {
  BRANCH_SCHEMATICS_HORIZONTAL,
  BRANCH_SCHEMATICS_VERTICAL,
} from "@/lib/tfl/branch-schematics"
import type { LineSchematic } from "@/lib/tfl/line-schematic"
import {
  resolveDiagramLineColor,
  resolveDiagramLineCssColor,
} from "@/lib/tfl/route-track"
import { cn } from "@/lib/utils"

type StripOrientation = "horizontal" | "vertical"

const schematicsFor = (
  orientation: StripOrientation
): Record<string, LineSchematic> =>
  orientation === "vertical"
    ? BRANCH_SCHEMATICS_VERTICAL
    : BRANCH_SCHEMATICS_HORIZONTAL

const lineOptions = (schematics: Record<string, LineSchematic>) =>
  Object.entries(schematics)
    .map(([lineId, schematic]) => ({
      lineId,
      lineName: schematic.lineName,
    }))
    .sort((a, b) => {
      if (a.lineId === "northern") return -1
      if (b.lineId === "northern") return 1
      return a.lineName.localeCompare(b.lineName, "en-GB")
    })

export const BranchLineStripPicker = ({
  orientation,
}: {
  orientation: StripOrientation
}) => {
  const schematics = schematicsFor(orientation)
  const options = useMemo(() => lineOptions(schematics), [schematics])
  const [lineId, setLineId] = useState("northern")
  const [mono, setMono] = useState(false)
  const schematic = schematics[lineId] ?? schematics.northern
  const lineColor =
    resolveDiagramLineCssColor(lineId) ?? resolveDiagramLineColor(lineId)

  const handleLineChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setLineId(event.target.value)
  }

  if (!schematic) {
    return (
      <p className="text-sm text-muted-foreground">
        No branch schematic for this line.
      </p>
    )
  }

  const strip = (
    <LineStrip
      lineId={lineId}
      schematic={schematic}
      lineColor={lineColor}
      mono={mono}
      className={orientation === "vertical" ? "p-4" : undefined}
    />
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Line</span>
          <select
            id={`branch-line-strip-picker-${orientation}`}
            name="branch-line"
            className="min-h-10 rounded-md border border-border bg-background px-3 py-2"
            value={lineId}
            onChange={handleLineChange}
            aria-label="Select branched line"
          >
            {options.map((option) => (
              <option key={option.lineId} value={option.lineId}>
                {option.lineName}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          aria-pressed={mono}
          onClick={() => setMono((current) => !current)}
          className={cn(
            "min-h-10 rounded-md px-3 py-2 text-sm transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            mono
              ? "bg-foreground text-background"
              : "bg-muted/60 text-foreground hover:bg-muted"
          )}
        >
          Mono
        </button>
        <p className="text-sm text-muted-foreground">
          {schematic.nodes.length} stops
        </p>
      </div>

      {orientation === "vertical" ? (
        <div className="max-h-[70vh] overflow-auto rounded-lg border border-border">
          {strip}
        </div>
      ) : (
        strip
      )}
    </div>
  )
}
