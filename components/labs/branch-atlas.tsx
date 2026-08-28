"use client"

import { useMemo, useState, type ChangeEvent } from "react"
import { LineStrip } from "@/components/tfl/diagram/line-strip"
import {
  BRANCH_SCHEMATICS_HORIZONTAL,
  BRANCH_SCHEMATICS_VERTICAL,
} from "@/lib/tfl/branch-schematics"
import { schematicStationKey } from "@/lib/tfl/line-schematic"
import {
  resolveDiagramLineColor,
  resolveDiagramLineCssColor,
} from "@/lib/tfl/route-track"
import { cn } from "@/lib/utils"

type AtlasOrientation = "horizontal" | "vertical"

const LINE_OPTIONS = Object.entries(BRANCH_SCHEMATICS_HORIZONTAL)
  .filter(([lineId]) => Boolean(BRANCH_SCHEMATICS_VERTICAL[lineId]))
  .map(([lineId, schematic]) => ({
    lineId,
    lineName: schematic.lineName,
  }))
  .sort((a, b) => a.lineName.localeCompare(b.lineName, "en-GB"))

const controlClassName = (selected: boolean) =>
  cn(
    "min-h-10 rounded-md border px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    selected
      ? "border-foreground bg-foreground text-background"
      : "border-border bg-background text-foreground hover:bg-muted"
  )

export const BranchAtlas = () => {
  const [lineId, setLineId] = useState("northern")
  const [orientation, setOrientation] = useState<AtlasOrientation>("vertical")
  const [mono, setMono] = useState(false)

  const schematics =
    orientation === "horizontal"
      ? BRANCH_SCHEMATICS_HORIZONTAL
      : BRANCH_SCHEMATICS_VERTICAL
  const schematic = schematics[lineId] ?? schematics.northern

  const stats = useMemo(() => {
    if (!schematic) return null
    return {
      branches: schematic.branches.length,
      stations: new Set(schematic.nodes.map(schematicStationKey)).size,
      renderedNodes: schematic.nodes.length,
    }
  }, [schematic])

  const handleLineChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setLineId(event.target.value)
  }

  if (!schematic || !stats) {
    return (
      <p className="text-sm text-muted-foreground">
        No branch diagram is available for this line.
      </p>
    )
  }

  const lineColor =
    resolveDiagramLineCssColor(lineId) ?? resolveDiagramLineColor(lineId)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-[minmax(12rem,1fr)_auto_auto] md:items-end">
        <label className="grid gap-1.5 text-sm">
          <span className="text-muted-foreground">Line</span>
          <select
            value={lineId}
            onChange={handleLineChange}
            className="min-h-10 rounded-md border border-border bg-background px-3 py-2 text-base text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {LINE_OPTIONS.map((option) => (
              <option key={option.lineId} value={option.lineId}>
                {option.lineName}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="grid gap-1.5">
          <legend className="text-sm text-muted-foreground">Direction</legend>
          <div className="flex gap-2">
            {(["horizontal", "vertical"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={orientation === value}
                onClick={() => setOrientation(value)}
                className={controlClassName(orientation === value)}
              >
                {value === "horizontal" ? "Across" : "Down"}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          aria-pressed={mono}
          onClick={() => setMono((current) => !current)}
          className={controlClassName(mono)}
        >
          Black and white
        </button>
      </div>

      <div
        className={cn(
          "rounded-xl border border-border bg-background",
          orientation === "vertical"
            ? "mx-auto max-h-[75vh] max-w-3xl overflow-auto"
            : "overflow-hidden"
        )}
      >
        <LineStrip
          lineId={lineId}
          schematic={schematic}
          lineColor={lineColor}
          mono={mono}
          className="p-4"
        />
      </div>

      <div className="grid grid-cols-3 gap-3" aria-label="Diagram summary">
        <div className="rounded-lg bg-muted/45 p-3">
          <p className="text-2xl text-foreground">{stats.stations}</p>
          <p className="text-xs text-muted-foreground">stations</p>
        </div>
        <div className="rounded-lg bg-muted/45 p-3">
          <p className="text-2xl text-foreground">{stats.branches}</p>
          <p className="text-xs text-muted-foreground">branches</p>
        </div>
        <div className="rounded-lg bg-muted/45 p-3">
          <p className="text-2xl text-foreground">{stats.renderedNodes}</p>
          <p className="text-xs text-muted-foreground">drawn nodes</p>
        </div>
      </div>

      {schematic.branches.length > 0 ? (
        <ul
          className="flex flex-wrap gap-2 text-xs text-muted-foreground"
          aria-label="Named branches"
        >
          {schematic.branches.map((branch) => (
            <li
              key={branch.id}
              className="rounded-full border border-border px-2.5 py-1"
            >
              {branch.name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
