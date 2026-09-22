"use client"

import { useRef, useState } from "react"
import { X } from "lucide-react"
import { hasMove } from "@/lib/tfl/investigate/vertex-scenarios"
import {
  PORT_DEMO_NAMES,
  type DirectedMatrix,
  type DirectedMove,
  type PortId,
} from "@/lib/tfl/investigate/vertex-scenarios/types"
import { cn } from "@/lib/utils"

export type MovementMatrixProps = {
  matrix: DirectedMatrix
  preview: DirectedMove | null
  onPreview: (move: DirectedMove | null) => void
  onToggle?: (move: DirectedMove) => void
  linked?: boolean
  onLinkedChange?: (linked: boolean) => void
  density?: "compact" | "comfortable"
  caption?: string
}

export const useMovementPreview = () => {
  const [preview, setPreview] = useState<DirectedMove | null>(null)
  return { preview, setPreview }
}

const isPreview = (preview: DirectedMove | null, from: string, to: string) =>
  preview != null && preview.from === from && preview.to === to

const getPortDisplayName = (port: PortId) => PORT_DEMO_NAMES[port] ?? port

const stillInside = (current: EventTarget | null, next: EventTarget | null) =>
  current instanceof Node && next instanceof Node && current.contains(next)

export function MovementMatrix({
  matrix,
  preview,
  onPreview,
  onToggle,
  linked = true,
  onLinkedChange,
  density = "comfortable",
  caption,
}: MovementMatrixProps) {
  const tableRef = useRef<HTMLTableElement>(null)
  const editable = onToggle != null
  const compact = density === "compact"

  const handleLeave = (next: EventTarget | null) => {
    if (stillInside(tableRef.current, next)) return
    onPreview(null)
  }

  return (
    <div className="overflow-x-auto">
      <table
        ref={tableRef}
        className={cn(
          "w-full table-fixed border-collapse border border-border",
          compact ? "text-xs" : "text-sm"
        )}
        onPointerLeave={(event) => handleLeave(event.relatedTarget)}
        onBlur={(event) => handleLeave(event.relatedTarget)}
      >
        <caption className="sr-only">
          {caption ?? "From row through S to column."}
        </caption>
        <thead>
          <tr>
            {/* Corner cell: diagonal TL→BR, "from" bottom-left, "to" top-right */}
            <th
              scope="col"
              className={cn(
                "relative border-r border-b border-border p-0 font-normal",
                compact ? "h-8" : "h-10"
              )}
            >
              <svg
                className="absolute inset-0 h-full w-full text-border"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <line
                  x1="7"
                  y1="7"
                  x2="93"
                  y2="93"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <span className="absolute bottom-1 left-1.5 text-[11px] leading-none text-muted-foreground">
                from
              </span>
              <span className="absolute top-1 right-1.5 text-[11px] leading-none text-muted-foreground">
                to
              </span>
            </th>
            {matrix.ports.map((port) => {
              const display = getPortDisplayName(port)
              return (
                <th
                  scope="col"
                  key={port}
                  title={`${port} · ${display}`}
                  className="border-r border-b border-border px-1 py-1.5 text-center align-middle leading-tight font-medium break-words hyphens-auto text-muted-foreground"
                >
                  {display}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {matrix.ports.map((from) => {
            const fromDisplay = getPortDisplayName(from)
            return (
              <tr key={from}>
                <th
                  scope="row"
                  title={`${from} · ${fromDisplay}`}
                  className="border-r border-b border-border px-2 py-1.5 text-left align-middle leading-tight font-medium break-words hyphens-auto text-muted-foreground"
                >
                  {fromDisplay}
                </th>
                {matrix.ports.map((to) => {
                  if (from === to) {
                    return (
                      <td
                        key={to}
                        className="border-r border-b border-border p-0 align-middle"
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "relative block",
                            compact ? "h-8" : "h-10"
                          )}
                        >
                          <svg
                            className="absolute inset-0 h-full w-full text-border"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                          >
                            <line
                              x1="7"
                              y1="7"
                              x2="93"
                              y2="93"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              vectorEffect="non-scaling-stroke"
                            />
                          </svg>
                        </span>
                        <span className="sr-only">same arm</span>
                      </td>
                    )
                  }
                  const wanted = hasMove(matrix, from, to)
                  const hovering = isPreview(preview, from, to)
                  const toDisplay = getPortDisplayName(to)
                  const label = wanted
                    ? `${fromDisplay} to ${toDisplay}: allowed through S`
                    : `${fromDisplay} to ${toDisplay}: cannot go through S`
                  const mark = wanted ? (
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full bg-current"
                    />
                  ) : (
                    <X
                      aria-hidden="true"
                      className="size-4"
                      strokeWidth={1.75}
                    />
                  )
                  const cellHeight = compact ? "h-8" : "h-10"
                  const ink = wanted
                    ? "text-foreground"
                    : "text-muted-foreground"
                  if (!editable) {
                    return (
                      <td
                        key={to}
                        className={cn(
                          "border-r border-b border-border p-0 align-middle",
                          hovering &&
                            "outline-2 -outline-offset-2 outline-foreground"
                        )}
                        onPointerEnter={(event) => {
                          if (event.pointerType !== "mouse") return
                          onPreview({ from, to })
                        }}
                        onFocus={() => onPreview({ from, to })}
                      >
                        <span
                          className={cn(
                            "flex w-full items-center justify-center",
                            cellHeight,
                            ink
                          )}
                          role="img"
                          aria-label={label}
                        >
                          {mark}
                        </span>
                      </td>
                    )
                  }
                  return (
                    <td
                      key={to}
                      className={cn(
                        "border-r border-b border-border p-0 align-middle",
                        hovering &&
                          "outline-2 -outline-offset-2 outline-foreground"
                      )}
                    >
                      <button
                        type="button"
                        aria-pressed={wanted}
                        aria-label={`Toggle ${label}`}
                        onPointerEnter={(event) => {
                          if (event.pointerType !== "mouse") return
                          onPreview({ from, to })
                        }}
                        onFocus={() => onPreview({ from, to })}
                        onClick={() => onToggle?.({ from, to })}
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-center focus-visible:outline-2 focus-visible:outline-ring",
                          cellHeight,
                          ink
                        )}
                      >
                        {mark}
                      </button>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      {editable && onLinkedChange ? (
        <label
          className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"
          title="When checked, clicking a cell also adds or removes the reverse movement"
        >
          <input
            type="checkbox"
            checked={linked}
            onChange={(event) => onLinkedChange(event.target.checked)}
          />
          Edit both ways
          <span className="text-muted-foreground/80">
            · click also toggles the reverse
          </span>
        </label>
      ) : null}
    </div>
  )
}
