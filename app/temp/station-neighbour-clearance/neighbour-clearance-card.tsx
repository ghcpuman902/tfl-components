import { StationName } from "@/components/tfl/station-name";
import { cn } from "@/lib/utils";
import type { NeighbourClearanceResult } from "@/lib/tfl/station-neighbour-clearance";

/**
 * Visual close-up of one adjacent-station pair at real diagram pitch/font.
 * Renders the exact `lines` the pure diagnostic chose (not a fresh
 * client-side measure) so the picture and the numbers never disagree.
 */
export const NeighbourClearanceCard = ({
  result,
  label,
}: {
  result: NeighbourClearanceResult;
  label?: string;
}) => {
  const { a, b, pitchPx, fontSizePx, minClearanceEm, gapEm, clears } = result;
  const clearancePx = minClearanceEm * fontSizePx;
  const lineHeight = 1.15;
  const boxHeight = fontSizePx * lineHeight * 2 + 16;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {label ?? `${a.displayName} → ${b.displayName}`}
        </p>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-xs font-medium tabular-nums",
            clears
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              : "bg-destructive/15 text-destructive",
          )}
        >
          {gapEm.toFixed(2)}em gap · target {minClearanceEm}em
        </span>
      </div>

      <div className="overflow-x-auto">
        <div
          className="relative mx-auto"
          style={{ width: pitchPx * 2, height: boxHeight, minWidth: pitchPx * 2 }}
        >
          {/* Required clearance zone, centred on the shared pitch boundary. */}
          <div
            aria-hidden
            className={cn(
              "absolute top-0 border-x border-dashed",
              clears ? "border-emerald-500/40" : "border-destructive/50",
            )}
            style={{
              left: pitchPx - clearancePx / 2,
              width: clearancePx,
              height: boxHeight,
            }}
          />

          {/* Measured label footprints — what the diagnostic actually counted. */}
          <div
            aria-hidden
            className="absolute top-0 bg-primary/10"
            style={{
              left: pitchPx / 2 - a.widthPx / 2,
              width: a.widthPx,
              height: boxHeight,
            }}
          />
          <div
            aria-hidden
            className="absolute top-0 bg-primary/10"
            style={{
              left: pitchPx * 1.5 - b.widthPx / 2,
              width: b.widthPx,
              height: boxHeight,
            }}
          />

          {/* Station markers. */}
          <span
            aria-hidden
            className="absolute top-0 size-1.5 -translate-x-1/2 rounded-full bg-foreground"
            style={{ left: pitchPx / 2 }}
          />
          <span
            aria-hidden
            className="absolute top-0 size-1.5 -translate-x-1/2 rounded-full bg-foreground"
            style={{ left: pitchPx * 1.5 }}
          />

          {/* Real StationName paint — same lines the diagnostic measured. */}
          <div
            className="absolute top-3 flex justify-center text-center"
            style={{ left: 0, width: pitchPx }}
          >
            <StationName
              name={a.displayName}
              lines={a.lines}
              layout="fixed"
              align="center"
              className="font-medium text-foreground"
              style={{ fontSize: fontSizePx * a.scale, lineHeight }}
            />
          </div>
          <div
            className="absolute top-3 flex justify-center text-center"
            style={{ left: pitchPx, width: pitchPx }}
          >
            <StationName
              name={b.displayName}
              lines={b.lines}
              layout="fixed"
              align="center"
              className="font-medium text-foreground"
              style={{ fontSize: fontSizePx * b.scale, lineHeight }}
            />
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
        <div>
          <dt className="inline">pitch </dt>
          <dd className="inline font-mono tabular-nums">{pitchPx.toFixed(0)}px</dd>
        </div>
        <div>
          <dt className="inline">a width </dt>
          <dd className="inline font-mono tabular-nums">{a.widthPx.toFixed(0)}px</dd>
        </div>
        <div>
          <dt className="inline">b width </dt>
          <dd className="inline font-mono tabular-nums">{b.widthPx.toFixed(0)}px</dd>
        </div>
        <div>
          <dt className="inline">abbreviated </dt>
          <dd className="inline">
            {a.abbreviated || b.abbreviated
              ? [a.abbreviated ? a.name : null, b.abbreviated ? b.name : null]
                  .filter(Boolean)
                  .join(", ")
              : "no"}
          </dd>
        </div>
      </dl>
    </div>
  );
};
