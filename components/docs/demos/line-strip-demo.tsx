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
import { getCachedLineSpine } from "@/lib/tfl/line-spine-data";
import {
  SIMPLE_LINE_STRIP_IDS,
  type SimpleLineStripId,
} from "@/lib/tfl/route-track";
import { cn } from "@/lib/utils";
import {
  LabelPlacementDemo,
  LiveLineStripPicker,
  PartClosureDemo,
  type LiveStripRoute,
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

const SIMPLE_ORDER = new Map(
  SIMPLE_LINE_STRIP_IDS.map((id, index) => [id, index]),
);

async function LiveStripSection() {
  const spines = await Promise.all(
    SIMPLE_LINE_STRIP_IDS.map((id) => getCachedLineSpine(id)),
  );

  const simpleRoutes: LiveStripRoute[] = spines
    .map(
      (spine): LiveStripRoute => ({
        lineId: spine.lineId,
        lineName: spine.lineName,
        lineColor: spine.lineColor,
        stations: spine.stations,
        routeError: spine.routeError,
      }),
    )
    .sort(
      (a, b) =>
        (SIMPLE_ORDER.get(a.lineId as SimpleLineStripId) ?? 99) -
        (SIMPLE_ORDER.get(b.lineId as SimpleLineStripId) ?? 99),
    );

  return (
    <LiveLineStripPicker routes={simpleRoutes} defaultLineId="victoria" />
  );
}

const LiveSkeleton = () => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">
      Victoria line · sample sequence
    </p>
    <LineStrip
      lineId="victoria"
      stations={VICTORIA_STRIP}
      lineColor={VICTORIA_LINE_COLOR}
      lineName="Victoria line"
    />
  </div>
);

export default function LineStripDemo() {
  const journey = sliceJourney(VICTORIA_SAMPLE, "finsbury", "victoria")!;

  return (
    <div className={cn("space-y-10", DIAGRAM_SCALE_CLASS)}>
      <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Live strip</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Simple (non-branch) corridors only: Waterloo &amp; City, Jubilee,
          Piccadilly, Victoria, Liberty (Overground), and London Cable Car.
          Overground paints as parallel rails; cable car is three red rails with
          white gaps. Branched lines live under{" "}
          <Link href="/docs/branch-strip-horizontal" className="underline">
            Branch strip — horizontal
          </Link>
          {" / "}
          <Link href="/docs/branch-strip-vertical" className="underline">
            vertical
          </Link>
          . Desktop scale matches the reference baseline (
          {DIAGRAM_BASELINE.horizontal}px line).
        </p>
        <Suspense fallback={<LiveSkeleton />}>
          <LiveStripSection />
        </Suspense>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Mono</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          B&amp;W Tube-map stroke motifs on the graph. Pass{" "}
          <code className="rounded bg-muted px-1 text-xs">mono</code>. Motifs
          scale through{" "}
          <code className="rounded bg-muted px-1 text-xs">x</code>, not the
          inherited diagram scale.
        </p>
        <LineStrip
          lineId="victoria"
          stations={VICTORIA_STRIP}
          lineName="Victoria line"
          mono
        />
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
          <Link href="/docs/branch-strip-horizontal" className="underline">
            Branch strip — horizontal
          </Link>
          {" / "}
          <Link href="/docs/branch-strip-vertical" className="underline">
            vertical
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
