"use client"

import {
  LineBadge,
  LINE_CHIP_DIAGRAM_CLASS,
} from "@/components/tfl/brand/line-badge"
import {
  DiagramAnchorBox,
  type DiagramAnchor,
  type DiagramAnchorBoxProps,
} from "@/components/tfl/diagram-anchor-box"
import { diagramAtomMetrics } from "@/lib/tfl/diagram-atoms"
import { cn } from "@/lib/utils"

export type LineFlag = { id: string; name?: string }

export type LineFlagStackProps = Pick<
  DiagramAnchorBoxProps,
  "debug" | "gap"
> & {
  lines: readonly LineFlag[]
  /** Side of the stack that faces the tick / ring. */
  anchor: DiagramAnchor
}

/**
 * Stacked §9 diagram chips for connecting lines, in the same anchored box
 * as a station name (padding on three sides, clearance toward the mark).
 */
export const LineFlagStack = ({
  lines,
  anchor,
  debug,
  gap,
}: LineFlagStackProps) => {
  const metrics = diagramAtomMetrics()
  if (lines.length === 0) return null
  return (
    <DiagramAnchorBox
      anchor={anchor}
      debug={debug}
      gap={gap}
      aria-label={`Connections: ${lines.map((line) => line.name ?? line.id).join(", ")}`}
    >
      {lines.map((line) => (
        <LineBadge
          key={line.id}
          lineId={line.id}
          name={line.name}
          diagram
          className={cn(LINE_CHIP_DIAGRAM_CLASS, "relative z-10")}
          style={{
            height: metrics.flagHeight,
            minWidth: metrics.flagMinWidth,
            fontSize: metrics.flagFont,
          }}
        />
      ))}
    </DiagramAnchorBox>
  )
}
