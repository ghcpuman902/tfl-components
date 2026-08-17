import { StationName } from "@/components/tfl/station-name";
import {
  BranchStripTrack,
  prepareBranchStripView,
  type BranchStripSharedProps,
} from "@/components/tfl/diagram/branch-strip-parts";
import { cn } from "@/lib/utils";

/**
 * Horizontal branched strip: labels above / below the corridor.
 *
 * Visual checklist: http://localhost:3999/docs/branch-strip-horizontal
 * Automated guards: `pnpm test` → `lib/tfl/schematic-layout.test.ts`
 */
export type BranchStripHorizontalProps = BranchStripSharedProps;

export const BranchStripHorizontal = (props: BranchStripHorizontalProps) => {
  const view = prepareBranchStripView(props, "horizontal");
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
  } = view;
  const { nameFont, labelLineHeight, labelClearance, labelMaxWidth } = metrics;
  const labelStyle = {
    fontSize: nameFont,
    lineHeight: labelLineHeight,
    textShadow:
      "0 0 3px var(--background), 0 0 3px var(--background), 0 0 6px var(--background)",
  } as const;

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
          const nodeX = point.x + svgOffsetX;
          const nodeY = point.y + svgOffsetY;
          const labelLines = nodeLabelLines?.[point.id];
          const placement = placementById.get(point.id);
          const labelAbove = (placement?.side ?? "above") === "above";

          return (
            <div
              key={`label-${point.id}`}
              className="pointer-events-auto absolute z-10"
              style={{
                left: nodeX,
                top: labelAbove
                  ? nodeY - labelClearance
                  : nodeY + labelClearance,
                width: labelMaxWidth,
                transform: labelAbove
                  ? "translate(-50%, -100%)"
                  : "translate(-50%, 0)",
              }}
            >
              <StationName
                name={point.name}
                lines={labelLines}
                layout={labelLines?.length ? "fixed" : "auto"}
                maxWidth={labelMaxWidth}
                maxLines={2}
                allowScaleDown={false}
                align="center"
                className="font-medium text-foreground"
                style={labelStyle}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
