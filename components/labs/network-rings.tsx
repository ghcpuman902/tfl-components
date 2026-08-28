"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"

export type NetworkRingLine = {
  id: string
  name: string
  mode: string
  colour: string
  stationCount: number
}

type RingView = "tube" | "all"

const VIEW_OPTIONS: readonly { value: RingView; label: string }[] = [
  { value: "tube", label: "Tube" },
  { value: "all", label: "Rail and tram" },
]

const SIZE = 720
const CENTRE = SIZE / 2
const INNER_RADIUS = 62
const OUTER_RADIUS = 320

const idOffset = (id: string): number =>
  [...id].reduce((total, character) => total + character.charCodeAt(0), 0) % 360

const svgCoordinate = (value: number): number => Number(value.toFixed(3))

const optionClassName = (selected: boolean) =>
  cn(
    "min-h-10 rounded-md border px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    selected
      ? "border-foreground bg-foreground text-background"
      : "border-border bg-background text-foreground hover:bg-muted"
  )

export const NetworkRings = ({
  lines,
}: {
  lines: readonly NetworkRingLine[]
}) => {
  const [view, setView] = useState<RingView>("tube")
  const [selectedId, setSelectedId] = useState("victoria")

  const visibleLines = useMemo(() => {
    const selected =
      view === "tube"
        ? lines.filter((line) => line.mode === "Underground")
        : [...lines]
    return selected.sort(
      (a, b) =>
        a.stationCount - b.stationCount || a.name.localeCompare(b.name, "en-GB")
    )
  }, [lines, view])

  const selectedLine =
    visibleLines.find((line) => line.id === selectedId) ??
    visibleLines.find((line) => line.id === "victoria") ??
    visibleLines[0]

  const handleViewChange = (nextView: RingView) => {
    setView(nextView)
    if (
      nextView === "tube" &&
      !lines.some(
        (line) => line.id === selectedId && line.mode === "Underground"
      )
    ) {
      setSelectedId("victoria")
    }
  }

  if (!selectedLine) {
    return <p className="text-sm text-muted-foreground">No lines to draw.</p>
  }

  const radiusStep =
    visibleLines.length > 1
      ? (OUTER_RADIUS - INNER_RADIUS) / (visibleLines.length - 1)
      : 0

  return (
    <div className="space-y-4">
      <fieldset className="rounded-xl border border-border bg-card p-4">
        <legend className="px-1 text-sm text-muted-foreground">Network</legend>
        <div className="flex flex-wrap gap-2">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={view === option.value}
              onClick={() => handleViewChange(option.value)}
              className={optionClassName(view === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="overflow-hidden rounded-xl border border-border bg-card p-2 sm:p-4">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="aspect-square h-auto w-full"
            role="img"
            aria-label={`${visibleLines.length} concentric transport lines. ${selectedLine.name} selected with ${selectedLine.stationCount} stations.`}
          >
            {visibleLines.map((line, lineIndex) => {
              const radius = INNER_RADIUS + lineIndex * radiusStep
              const selected = line.id === selectedLine.id
              const rotation = (idOffset(line.id) * Math.PI) / 180

              return (
                <g key={line.id}>
                  <circle
                    cx={CENTRE}
                    cy={CENTRE}
                    r={radius}
                    fill="none"
                    stroke={line.colour}
                    strokeOpacity={selected ? 1 : 0.48}
                    strokeWidth={selected ? 5 : 2.5}
                    className="cursor-pointer"
                    onPointerEnter={() => setSelectedId(line.id)}
                    onClick={() => setSelectedId(line.id)}
                  />
                  {Array.from({ length: line.stationCount }, (_, index) => {
                    const angle =
                      (index / line.stationCount) * Math.PI * 2 -
                      Math.PI / 2 +
                      rotation
                    return (
                      <circle
                        key={`${line.id}-${index}`}
                        cx={svgCoordinate(CENTRE + Math.cos(angle) * radius)}
                        cy={svgCoordinate(CENTRE + Math.sin(angle) * radius)}
                        r={selected ? 3.2 : 2.1}
                        fill={line.colour}
                        pointerEvents="none"
                      />
                    )
                  })}
                </g>
              )
            })}

            <circle
              cx={CENTRE}
              cy={CENTRE}
              r="47"
              className="fill-background stroke-border"
              strokeWidth="1"
            />
            <text
              x={CENTRE}
              y={CENTRE - 7}
              textAnchor="middle"
              className="fill-foreground text-[18px]"
            >
              {selectedLine.name}
            </text>
            <text
              x={CENTRE}
              y={CENTRE + 17}
              textAnchor="middle"
              className="fill-muted-foreground text-[14px]"
            >
              {selectedLine.stationCount} stations
            </text>
          </svg>
        </div>

        <ul className="grid content-start gap-1 rounded-xl border border-border bg-card p-2 sm:grid-cols-2 lg:grid-cols-1">
          {visibleLines.map((line) => {
            const selected = line.id === selectedLine.id
            return (
              <li key={line.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedId(line.id)}
                  onPointerEnter={() => setSelectedId(line.id)}
                  className={cn(
                    "flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    selected ? "bg-muted text-foreground" : "text-foreground"
                  )}
                >
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: line.colour }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{line.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {line.stationCount}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
