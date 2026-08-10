import Link from "next/link";
import { Suspense } from "react";
import { JourneyDiagram } from "@/components/tfl/diagram/journey-diagram";
import { LineRouteDiagram } from "@/components/tfl/diagram/line-route-diagram";
import { LineStrip } from "@/components/tfl/diagram/line-strip";
import { sliceJourney } from "@/lib/tfl/diagram-mappers";
import type { DiagramSegment, DiagramStation } from "@/lib/tfl/diagram-station";
import { UNDERGROUND_LINE_COLOURS } from "@/lib/tfl/brand-colours";
import {
  DIAGRAM_BASELINE,
  DIAGRAM_SCALE_CLASS,
} from "@/lib/tfl/line-diagram";
import { getCachedWeekAheadRoutes } from "@/lib/tfl/week-ahead-data";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  LabelPlacementDemo,
  LiveLineStripPicker,
  PartClosureDemo,
} from "@/components/docs/demos/line-strip-demo-controls";

const U = UNDERGROUND_LINE_COLOURS;

/** Curated Victoria southbound spine for offline / always-on demos. */
const VICTORIA_SAMPLE: DiagramStation[] = [
  { id: "walthamstow", name: "Walthamstow Central", interchange: true, nationalRail: true },
  { id: "blackhorse", name: "Blackhorse Road", interchange: true },
  { id: "tottenham", name: "Tottenham Hale", interchange: true, nationalRail: true },
  { id: "seven-sisters", name: "Seven Sisters", interchange: true, nationalRail: true },
  { id: "finsbury", name: "Finsbury Park", interchange: true, nationalRail: true },
  { id: "highbury", name: "Highbury & Islington", interchange: true },
  { id: "kings-cross", name: "King's Cross St. Pancras", interchange: true, nationalRail: true },
  { id: "euston", name: "Euston", interchange: true, nationalRail: true },
  { id: "warren-street", name: "Warren Street", interchange: true },
  { id: "oxford-circus", name: "Oxford Circus", interchange: true },
  { id: "green-park", name: "Green Park", interchange: true },
  { id: "victoria", name: "Victoria", interchange: true, nationalRail: true },
  { id: "pimlico", name: "Pimlico" },
  { id: "vauxhall", name: "Vauxhall", interchange: true, nationalRail: true },
  { id: "stockwell", name: "Stockwell", interchange: true },
  { id: "brixton", name: "Brixton", interchange: true },
];

/**
 * Simplified Victoria strip demo — key Tube interchange flag blocks.
 * National Rail uses the pictogram beside the name, not a text flag.
 */
const VICTORIA_STRIP: DiagramStation[] = [
  { id: "walthamstow", name: "Walthamstow Central", interchange: true, nationalRail: true },
  { id: "blackhorse", name: "Blackhorse Road", interchange: true },
  { id: "tottenham", name: "Tottenham Hale", interchange: true, nationalRail: true },
  { id: "seven-sisters", name: "Seven Sisters", interchange: true, nationalRail: true },
  {
    id: "finsbury",
    name: "Finsbury Park",
    interchange: true,
    nationalRail: true,
    connections: [
      { id: "piccadilly", name: "Piccadilly", color: U.piccadilly.hex },
    ],
  },
  { id: "highbury", name: "Highbury & Islington", interchange: true },
  {
    id: "kings-cross",
    name: "King's Cross St. Pancras",
    interchange: true,
    nationalRail: true,
    connections: [
      { id: "circle", name: "Circle", color: U.circle.hex, darkText: true },
      {
        id: "hammersmith-city",
        name: "Hammersmith & City",
        color: U.hammersmithCity.hex,
        darkText: true,
      },
      { id: "metropolitan", name: "Metropolitan", color: U.metropolitan.hex },
      { id: "northern", name: "Northern", color: U.northern.hex },
      { id: "piccadilly", name: "Piccadilly", color: U.piccadilly.hex },
    ],
  },
  {
    id: "euston",
    name: "Euston",
    interchange: true,
    nationalRail: true,
    connections: [{ id: "northern", name: "Northern", color: U.northern.hex }],
  },
  {
    id: "warren-street",
    name: "Warren Street",
    interchange: true,
    connections: [{ id: "northern", name: "Northern", color: U.northern.hex }],
  },
  {
    id: "oxford-circus",
    name: "Oxford Circus",
    interchange: true,
    connections: [
      { id: "bakerloo", name: "Bakerloo", color: U.bakerloo.hex },
      { id: "central", name: "Central", color: U.central.hex },
    ],
  },
  {
    id: "green-park",
    name: "Green Park",
    interchange: true,
    connections: [
      { id: "jubilee", name: "Jubilee", color: U.jubilee.hex },
      { id: "piccadilly", name: "Piccadilly", color: U.piccadilly.hex },
    ],
  },
  {
    id: "victoria",
    name: "Victoria",
    interchange: true,
    nationalRail: true,
    connections: [
      { id: "circle", name: "Circle", color: U.circle.hex, darkText: true },
      { id: "district", name: "District", color: U.district.hex },
    ],
  },
  { id: "pimlico", name: "Pimlico" },
  { id: "vauxhall", name: "Vauxhall", interchange: true, nationalRail: true },
  {
    id: "stockwell",
    name: "Stockwell",
    interchange: true,
    connections: [{ id: "northern", name: "Northern", color: U.northern.hex }],
  },
  { id: "brixton", name: "Brixton", interchange: true },
];

/** Sample: no service between Seven Sisters and Green Park — endpoints stay open. */
const PART_CLOSURE_SEGMENTS: DiagramSegment[] = (() => {
  const from = "seven-sisters";
  const to = "green-park";
  const fromIndex = VICTORIA_STRIP.findIndex((s) => s.id === from);
  const toIndex = VICTORIA_STRIP.findIndex((s) => s.id === to);
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= toIndex) return [];
  const segments: DiagramSegment[] = [];
  for (let i = fromIndex; i < toIndex; i += 1) {
    segments.push({
      fromStationId: VICTORIA_STRIP[i]!.id,
      toStationId: VICTORIA_STRIP[i + 1]!.id,
      state: "out-of-use",
    });
  }
  return segments;
})();

const victoriaBlue = U.victoria.hex;

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
          lineColor={victoriaBlue}
          lineName="Victoria line"
          segments={PART_CLOSURE_SEGMENTS}
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
          lineColor={victoriaBlue}
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
          lineColor={victoriaBlue}
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
            lineColor={victoriaBlue}
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
            lineColor={victoriaBlue}
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
          <Link href="/components/branch-strip" className="underline">
            Branch strip
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
