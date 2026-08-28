import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { ux, verticalDiagramMetrics } from "@/lib/tfl/line-diagram"
import {
  LineBadge,
  LINE_CHIP_DIAGRAM_CLASS,
} from "@/components/tfl/brand/line-badge"

export type DiagramMarkerKind = "tick-right" | "tick-both" | "ring"

export type DiagramStationMarkerProps = {
  kind: DiagramMarkerKind
  lineColor: string
  /** Marker column width (CSS length). Defaults to vertical metrics. */
  columnWidth?: string
  /** Row / column height for the marker slot (CSS length). */
  slotHeight?: string
  className?: string
}

/**
 * Shared stop marker for vertical / journey diagrams.
 * - tick-right: mid-route dash on the label side of the route only
 * - tick-both: terminal crossbar (both sides)
 * - ring: interchange / journey stop (white fill / black outline; inverted in dark)
 */
export const DiagramStationMarker = ({
  kind,
  lineColor,
  columnWidth,
  slotHeight,
  className,
}: DiagramStationMarkerProps) => {
  const m = verticalDiagramMetrics()
  const width = columnWidth ?? m.markerCol
  const height = slotHeight ?? m.markerSlot

  return (
    <div
      className={cn(
        "relative z-10 flex shrink-0 items-center justify-center",
        className
      )}
      style={{ width, height }}
    >
      {kind === "ring" ? (
        <span
          className="box-border block rounded-full border-solid border-black bg-white dark:border-white dark:bg-black"
          style={{
            width: m.ringOuter,
            height: m.ringOuter,
            borderWidth: m.ringStroke,
          }}
          aria-hidden
        />
      ) : null}

      {kind === "tick-both" ? (
        <span
          className="block"
          style={{
            width: m.tickBothWidth,
            height: m.tickHeight,
            backgroundColor: lineColor,
          }}
          aria-hidden
        />
      ) : null}

      {kind === "tick-right" ? (
        <span
          className="absolute top-1/2 block -translate-y-1/2"
          style={{
            /* Align tick left edge with route-line left edge (column centre − ½x). */
            left: `calc(50% - (${m.lineWidth} / 2))`,
            width: m.tickRightWidth,
            height: m.tickHeight,
            backgroundColor: lineColor,
          }}
          aria-hidden
        />
      ) : null}
    </div>
  )
}

export type DiagramConnectionFlagsProps = {
  stationId: string
  connections: {
    id: string
    name: string
    color?: string
    darkText?: boolean
  }[]
}

/** §9-style stacked flag chips beside a vertical station name. */
export const DiagramConnectionFlags = ({
  stationId,
  connections,
}: DiagramConnectionFlagsProps) => {
  const m = verticalDiagramMetrics()
  if (connections.length === 0) return null

  return (
    <div
      className="inline-flex shrink-0 flex-col"
      aria-label={`Connections: ${connections.map((c) => c.name).join(", ")}`}
    >
      {connections.map((c) => (
        <LineBadge
          key={`${stationId}-${c.id}`}
          lineId={c.id}
          name={c.name}
          color={c.color}
          diagram
          className={cn(LINE_CHIP_DIAGRAM_CLASS, "w-full")}
          style={{
            height: m.flagHeight,
            minWidth: m.flagMinWidth,
            fontSize: m.flagFont,
          }}
        />
      ))}
    </div>
  )
}

/**
 * Continuous vertical route line centred on the marker column.
 * Top/bottom inset = half the uniform row pitch so the line starts and ends
 * on the first/last marker centres, with no stub segment.
 */
export const VerticalRouteLine = ({
  lineColor,
  markerCol,
  rowGap,
  className,
}: {
  lineColor: string
  markerCol: string
  rowGap: string
  className?: string
}) => (
  <div
    aria-hidden
    className={cn(
      "pointer-events-none absolute left-[calc(var(--marker)/2)] -translate-x-1/2",
      className
    )}
    style={
      {
        "--marker": markerCol,
        top: `calc(${rowGap} / 2)`,
        bottom: `calc(${rowGap} / 2)`,
        width: ux(1),
        backgroundColor: lineColor,
      } as CSSProperties
    }
  />
)

/**
 * Full-line / map markers: interchange → ring; terminal → both-side tick;
 * mid-route → right-side tick only.
 */
export const resolveMapMarkerKind = ({
  interchange,
  isEndpoint,
}: {
  interchange?: boolean
  isEndpoint?: boolean
}): DiagramMarkerKind => {
  if (interchange) return "ring"
  if (isEndpoint) return "tick-both"
  return "tick-right"
}

/** Journey A→B markers are always circles. */
export const resolveJourneyMarkerKind = (): DiagramMarkerKind => "ring"
