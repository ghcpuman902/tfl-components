"use client"

import type { CSSProperties, ReactNode } from "react"
import {
  diagramAtomMetrics,
  diagramLabelPad,
} from "@/lib/tfl/diagram-atoms"
import type { StationNameLineAnchor } from "@/lib/tfl/diagram-station"
import { cn } from "@/lib/utils"

export type DiagramAnchor = StationNameLineAnchor

/**
 * Chrome DevTools box-model colours: margin orange-red, padding green,
 * content grey. No border — the open side is the anchor. Exported so
 * other "Margins" overlays (e.g. `/drafts/vertex-scenarios`) paint the
 * same debug box, not a look-alike with drifted constants.
 */
export const DEBUG_MARGIN = "rgb(246 178 147 / 0.72)"
export const DEBUG_PADDING = "rgb(147 196 125 / 0.72)"
export const DEBUG_CONTENT = "rgb(160 160 160 / 0.4)"

const isVerticalAnchor = (anchor: DiagramAnchor) =>
  anchor === "above" || anchor === "below"

export type DiagramAnchorBoxProps = {
  /** Side of the box that faces the tick / ring. */
  anchor: DiagramAnchor
  /** Paint margin / padding / content like the DevTools overlay. */
  debug?: boolean
  /**
   * Layout gap from the padding box to the SVG edge so the padding edge
   * sits at `lineClearance`. This is the *only* clearance painted here —
   * the mark's own clearance band (bigger under a tick than a circle) is
   * drawn separately, inside the mark's own SVG (`markClearanceRect`), so
   * the two never drift apart by a rounded pixel at the HTML/SVG seam.
   */
  gap?: number
  className?: string
  contentClassName?: string
  "aria-label"?: string
  children: ReactNode
}

export const DiagramAnchorBox = ({
  anchor,
  debug = false,
  gap = 0,
  className,
  contentClassName,
  "aria-label": ariaLabel,
  children,
}: DiagramAnchorBoxProps) => {
  const pad = diagramLabelPad(anchor)
  const layoutGap = Math.max(0, gap)
  const vertical = isVerticalAnchor(anchor)
  const marginFirst = anchor === "above" || anchor === "left"
  const marginStyle: CSSProperties = vertical
    ? { height: layoutGap }
    : { width: layoutGap }
  const marginBand =
    layoutGap > 0 ? (
      <div
        aria-hidden
        className="pointer-events-none shrink-0 self-stretch"
        style={{
          ...marginStyle,
          ...(debug ? { backgroundColor: DEBUG_MARGIN } : {}),
        }}
      />
    ) : null

  return (
    <div
      className={cn(
        "inline-flex w-fit leading-none",
        vertical ? "flex-col" : "flex-row",
        className
      )}
      aria-label={ariaLabel}
    >
      {marginFirst ? marginBand : null}
      <div
        className={cn(
          "relative inline-flex w-fit flex-col leading-none",
          contentClassName
        )}
        style={{
          paddingTop: pad.top,
          paddingRight: pad.right,
          paddingBottom: pad.bottom,
          paddingLeft: pad.left,
          ...(debug ? { backgroundColor: DEBUG_PADDING } : {}),
        }}
      >
        {debug ? (
          <span
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              top: pad.top,
              right: pad.right,
              bottom: pad.bottom,
              left: pad.left,
              backgroundColor: DEBUG_CONTENT,
            }}
          />
        ) : null}
        {children}
      </div>
      {marginFirst ? null : marginBand}
    </div>
  )
}

/** Default name-box cap from atom metrics — wraps South Kensington, not Bermondsey. */
export const diagramLabelMaxWidth = (): number =>
  diagramAtomMetrics().labelMaxWidth
