import { StationName } from "@/components/tfl/station-name"
import {
  BranchStripTrack,
  prepareBranchStripView,
  type BranchStripSharedProps,
} from "@/components/tfl/diagram/branch-strip-parts"
import { verticalLabelOnLeft } from "@/lib/tfl/branch-strip-layout"
import { cn } from "@/lib/utils"

/**
 * Vertical branched strip: labels left / right of the corridor, stub-above
 * on short cross-axis spurs.
 *
 * Visual checklist: http://localhost:3999/docs/branch-strip-vertical
 * Automated guards: `pnpm test` → `lib/tfl/schematic-layout.test.ts`
 */
export type BranchStripVerticalProps = BranchStripSharedProps

export const BranchStripVertical = (props: BranchStripVerticalProps) => {
  const view = prepareBranchStripView(props, "vertical")
  const {
    schematic,
    layout,
    metrics,
    placementById,
    nodeLabelLines,
    canvasWidth,
    canvasHeight,
    svgOffsetX,
    svgOffsetY,
  } = view
  const {
    nameFont,
    labelLineHeight,
    labelClearance,
    verticalLabelWidth,
    labelGap,
  } = metrics
  const labelStyle = {
    fontSize: nameFont,
    lineHeight: labelLineHeight,
    textShadow:
      "0 0 3px var(--background), 0 0 3px var(--background), 0 0 6px var(--background)",
  } as const

  return (
    <div
      className={cn("relative w-full min-w-0 overflow-auto", props.className)}
      role="region"
      aria-label={`${schematic.lineName} branch strip`}
      tabIndex={0}
    >
      <div
        className="relative"
        style={{ width: canvasWidth, height: canvasHeight }}
      >
        <BranchStripTrack view={view} />

        {layout.points.map((point) => {
          const nodeX = point.x + svgOffsetX
          const nodeY = point.y + svgOffsetY
          const labelLines = nodeLabelLines?.[point.id]
          const placement = placementById.get(point.id)

          if (placement?.side === "stub-above") {
            return (
              <div
                key={`label-${point.id}`}
                className="pointer-events-auto absolute z-10"
                style={{
                  left: nodeX,
                  top: nodeY - labelClearance,
                  width: verticalLabelWidth,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <StationName
                  name={point.name}
                  lines={labelLines}
                  layout={labelLines?.length ? "fixed" : "auto"}
                  maxWidth={verticalLabelWidth}
                  maxLines={2}
                  allowScaleDown={false}
                  allowAbbreviation={false}
                  align="center"
                  className="font-medium text-foreground"
                  style={labelStyle}
                />
              </div>
            )
          }

          const labelOnLeft =
            placement?.side === "left" ||
            (placement?.side !== "right" && verticalLabelOnLeft(point, layout))

          return (
            <div
              key={`label-${point.id}`}
              className="pointer-events-auto absolute z-10"
              style={{
                left: labelOnLeft
                  ? nodeX - labelGap - verticalLabelWidth
                  : nodeX + labelGap,
                top: nodeY,
                width: verticalLabelWidth,
                transform: "translateY(-50%)",
              }}
            >
              <StationName
                name={point.name}
                lines={labelLines}
                layout={labelLines?.length ? "fixed" : "auto"}
                maxWidth={verticalLabelWidth}
                maxLines={2}
                allowScaleDown={false}
                allowAbbreviation={false}
                align={labelOnLeft ? "right" : "left"}
                className="font-medium text-foreground"
                style={labelStyle}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
