import Link from "next/link";
import { Suspense } from "react";
import { JourneyDiagram } from "@/components/tfl/diagram/journey-diagram";
import { LineRouteDiagram } from "@/components/tfl/diagram/line-route-diagram";
import { LineStrip } from "@/components/tfl/diagram/line-strip";
import { sliceJourney } from "@/lib/tfl/diagram-mappers";
import type { DiagramStation } from "@/lib/tfl/diagram-station";
import {
  DIAGRAM_BASELINE,
  DIAGRAM_SCALE_CLASS,
} from "@/lib/tfl/line-diagram";
import {
  VICTORIA_LINE_COLOR,
  VICTORIA_PART_CLOSURE_SEGMENTS,
  VICTORIA_STRIP,
} from "@/lib/tfl/fixtures/victoria-line-strip";
import { getCachedWeekAheadRoutes } from "@/lib/tfl/week-ahead-data";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  LabelPlacementDemo,
  LiveLineStripPicker,
  PartClosureDemo,
} from "@/components/docs/demos/line-strip-demo-controls";

/** Plain Victoria spine for journey-slice demos (no connection flags). */
const VICTORIA_SAMPLE: DiagramStation[] = VICTORIA_STRIP.map(
  ({ id, name, interchange, nationalRail }) => ({
    id,
    name,
    interchange,
    nationalRail,
  }),
);

async function LiveStripSection() {
  const { routes } = await getCachedWeekAheadRoutes();
  return <LiveLineStripPicker routes={routes} defaultLineId="bakerloo" />;
}

const LiveSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-10 w-48" />
    <Skeleton className="h-28 w-full" />
  </div>
);

export default function LineStripDemo() {
  const journey = sliceJourney(VICTORIA_SAMPLE, "finsbury", "victoria")!;

  return (
    <div className={cn("space-y-10", DIAGRAM_SCALE_CLASS)}>
      <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Live strip</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          One live strip with a line picker (Tube, Elizabeth, DLR, Overground,
          Tram). Connections drop bus/unknown IDs; National Rail is a pictogram
          beside the name. Desktop scale matches the reference baseline (
          {DIAGRAM_BASELINE.horizontal}px line).
        </p>
        <Suspense fallback={<LiveSkeleton />}>
          <LiveStripSection />
        </Suspense>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Part closure (sample)</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Victoria · no service between Seven Sisters and Green Park. The track
          between is muted. Boundary stops with an open side stay coloured;
          stops with every adjacent segment closed (interiors, and a far
          terminal if applicable) grey out. Pass{" "}
          <code className="rounded bg-muted px-1 text-xs">segments</code> and
          optionally{" "}
          <code className="rounded bg-muted px-1 text-xs">stationOutOfUseIds</code>
          .
        </p>
        <PartClosureDemo
          stations={VICTORIA_STRIP}
          lineColor={VICTORIA_LINE_COLOR}
          lineName="Victoria line"
          segments={VICTORIA_PART_CLOSURE_SEGMENTS}
        />
      </section>

      <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Label placement (sample)</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Names above the route (default), below, or alternating — TfL-style
          denser strips.{" "}
          <code className="rounded bg-muted px-1 text-xs">labelPlacement</code>
        </p>
        <LabelPlacementDemo
          stations={VICTORIA_STRIP}
          lineColor={VICTORIA_LINE_COLOR}
          lineName="Victoria line"
        />
      </section>

      <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Straight strip flags (sample)</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Curated Victoria southbound with Tube interchange flags. Scroll
          sideways on narrow viewports. Pass{" "}
          <code className="rounded bg-muted px-1 text-xs">fit</code> to fill the
          container without scrolling.
        </p>
        <LineStrip
          lineId="victoria"
          stations={VICTORIA_STRIP}
          lineColor={VICTORIA_LINE_COLOR}
          lineName="Victoria line"
        />
        <pre className="mt-4 overflow-x-auto rounded bg-muted p-3 text-xs text-foreground">
          {`import { DIAGRAM_SCALE_CLASS } from "@/lib/tfl/brand";
import { LineStrip } from "@/components/tfl/diagram/line-strip";

<div className={DIAGRAM_SCALE_CLASS}>
  <LineStrip
    lineId="victoria"
    lineName="Victoria line"
    lineColor="#039BE5"
    labelPlacement="alternate"
    stations={[{ id, name, interchange?, connections?, nationalRail? }, …]}
  />
</div>`}
        </pre>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Journey A→B (sample)</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Victoria line · Finsbury Park → Victoria. Collapse/expand the stops
          in between.
        </p>
        <div className="max-w-md">
          <JourneyDiagram
            from={journey.from}
            to={journey.to}
            intermediates={journey.intermediates}
            lineColor={VICTORIA_LINE_COLOR}
            lineName="Victoria line"
          />
        </div>
        <pre className="mt-4 overflow-x-auto rounded bg-muted p-3 text-xs text-foreground">
          {`import { JourneyDiagram } from "@/components/tfl/diagram/journey-diagram";

<JourneyDiagram
  lineName="Victoria line"
  lineColor="#039BE5"
  from={{ id: "finsbury", name: "Finsbury Park", interchange: true, nationalRail: true }}
  to={{ id: "victoria", name: "Victoria", interchange: true }}
  intermediates={[/* … */]}
/>`}
        </pre>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Full line with names (sample)</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Every stop on the spine — offline Victoria sample (no live Central
          duplicate). Right-side ticks for ordinary stops, full crossbars at
          terminals, rings for interchanges.
        </p>
        <div className="max-h-[22rem] max-w-md overflow-y-auto pr-2">
          <LineRouteDiagram
            stations={VICTORIA_SAMPLE}
            lineColor={VICTORIA_LINE_COLOR}
            lineName="Victoria line"
            directionLabel="Southbound"
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Explore live sequences in{" "}
          <Link href="/explore/lines" className="underline">
            Browse lines
          </Link>
          . Branched schematics live under{" "}
          <Link href="/primitives/branch-strip" className="underline">
            Branch strip
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
