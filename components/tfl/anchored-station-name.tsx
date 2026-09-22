"use client"

import { StationName, type StationNameProps } from "@/components/tfl/station-name"
import {
  DiagramAnchorBox,
  diagramLabelMaxWidth,
  type DiagramAnchor,
  type DiagramAnchorBoxProps,
} from "@/components/tfl/diagram-anchor-box"
import { diagramAtomMetrics } from "@/lib/tfl/diagram-atoms"
import { cn } from "@/lib/utils"

export type AnchoredStationNameProps = Omit<
  StationNameProps,
  "lineAnchor" | "layout" | "maxWidth" | "maxLines"
> &
  Pick<DiagramAnchorBoxProps, "debug" | "gap"> & {
    /** Side of the box that faces the tick / ring. */
    anchor: DiagramAnchor
    maxWidth?: number
  }

/**
 * StationName in a diagram box: padding on the three sides away from the
 * mark, clearance on the open side, optional DevTools-style debug paint.
 * Wraps to two lines when the name is wider than the box.
 */
export const AnchoredStationName = ({
  anchor,
  debug,
  gap,
  maxWidth,
  className,
  style,
  lines,
  ...nameProps
}: AnchoredStationNameProps) => {
  const metrics = diagramAtomMetrics()
  const width = maxWidth ?? diagramLabelMaxWidth()
  const hasRecipe = Boolean(lines?.length)
  return (
    <DiagramAnchorBox anchor={anchor} debug={debug} gap={gap}>
      <StationName
        {...nameProps}
        lines={lines}
        layout={hasRecipe ? "fixed" : "auto"}
        maxWidth={hasRecipe ? undefined : width}
        maxLines={2}
        fontSize={metrics.nameSize}
        allowScaleDown={false}
        allowAbbreviation={false}
        align="center"
        placeQualifier
        lineAnchor={anchor}
        className={cn(
          "relative z-10 h-auto w-fit justify-start font-medium text-foreground [text-box:trim-both_cap_alphabetic] [&_[aria-hidden=true]]:[text-box:trim-both_cap_alphabetic]",
          className
        )}
        style={{
          fontSize: metrics.nameSize,
          lineHeight: 1.15,
          maxWidth: hasRecipe ? undefined : width,
          ...style,
        }}
      />
    </DiagramAnchorBox>
  )
}
