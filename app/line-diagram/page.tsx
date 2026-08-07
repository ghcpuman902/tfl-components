import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { getLineInlineStyles } from "tfl-ts";
import {
  HorizontalLineDiagram,
  type HorizontalDiagramStation,
} from "@/components/tfl/horizontal-line-diagram";
import { JourneyDiagram } from "@/components/tfl/journey-diagram";
import { LineRouteDiagram } from "@/components/tfl/line-route-diagram";
import { sliceJourney, toDiagramStation } from "@/lib/tfl/diagram-mappers";
import type { DiagramStation } from "@/lib/tfl/diagram-station";
import { UNDERGROUND_LINE_COLOURS } from "@/lib/tfl/brand-colours";
import {
  DIAGRAM_BASELINE,
  DIAGRAM_SCALE_CLASS,
  DIAGRAM_SCALE_VAR,
  LINE_DIAGRAM,
  LINE_DIAGRAM_SOURCE,
} from "@/lib/tfl/line-diagram";
import { getTflClient } from "@/lib/tfl/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Line diagram",
  description:
    "Draw TfL-style route lines and A→B journeys with expandable stops.",
};

const U = UNDERGROUND_LINE_COLOURS;

/** Curated Victoria southbound spine for offline / always-on demos. */
const VICTORIA_SAMPLE: DiagramStation[] = [
  { id: "walthamstow", name: "Walthamstow Central", interchange: true },
  { id: "blackhorse", name: "Blackhorse Road", interchange: true },
  { id: "tottenham", name: "Tottenham Hale", interchange: true },
  { id: "seven-sisters", name: "Seven Sisters", interchange: true },
  { id: "finsbury", name: "Finsbury Park", interchange: true },
  { id: "highbury", name: "Highbury & Islington", interchange: true },
  { id: "kings-cross", name: "King's Cross St. Pancras", interchange: true },
  { id: "euston", name: "Euston", interchange: true },
  { id: "warren-street", name: "Warren Street", interchange: true },
  { id: "oxford-circus", name: "Oxford Circus", interchange: true },
  { id: "green-park", name: "Green Park", interchange: true },
  { id: "victoria", name: "Victoria", interchange: true },
  { id: "pimlico", name: "Pimlico" },
  { id: "vauxhall", name: "Vauxhall", interchange: true },
  { id: "stockwell", name: "Stockwell", interchange: true },
  { id: "brixton", name: "Brixton", interchange: true },
];

/**
 * Simplified horizontal Victoria demo — key Tube interchange flag blocks.
 */
const VICTORIA_HORIZONTAL: HorizontalDiagramStation[] = [
  { id: "walthamstow", name: "Walthamstow Central", interchange: true },
  { id: "blackhorse", name: "Blackhorse Road", interchange: true },
  { id: "tottenham", name: "Tottenham Hale", interchange: true },
  { id: "seven-sisters", name: "Seven Sisters", interchange: true },
  {
    id: "finsbury",
    name: "Finsbury Park",
    interchange: true,
    connections: [
      { id: "piccadilly", name: "Piccadilly", color: U.piccadilly.hex },
    ],
  },
  { id: "highbury", name: "Highbury & Islington", interchange: true },
  {
    id: "kings-cross",
    name: "King's Cross St. Pancras",
    interchange: true,
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
    connections: [
      { id: "circle", name: "Circle", color: U.circle.hex, darkText: true },
      { id: "district", name: "District", color: U.district.hex },
    ],
  },
  { id: "pimlico", name: "Pimlico" },
  { id: "vauxhall", name: "Vauxhall", interchange: true },
  {
    id: "stockwell",
    name: "Stockwell",
    interchange: true,
    connections: [{ id: "northern", name: "Northern", color: U.northern.hex }],
  },
  { id: "brixton", name: "Brixton", interchange: true },
];

const victoriaBlue = U.victoria.hex;
async function getCentralRouteStations() {
  "use cache";
  cacheLife({ revalidate: 300 });
  cacheTag("tfl-route", "tfl-route-central-outbound");

  const client = getTflClient();
  const sequence = await client.line.getRouteSequence({
    id: "central",
    direction: "outbound",
  });

  const orderedIds = sequence.orderedLineRoutes?.[0]?.naptanIds;
  const byId = new Map(
    (sequence.stations ?? []).map((s) => [s.id ?? "", s] as const),
  );

  if (orderedIds && orderedIds.length > 0) {
    return orderedIds
      .map((id) => byId.get(id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((s) => toDiagramStation(s, "central"));
  }

  const stops =
    sequence.stopPointSequences?.flatMap((seq) => seq.stopPoint ?? []) ?? [];
  const seen = new Set<string>();
  return stops
    .filter((s) => {
      const id = s.id ?? s.name ?? "";
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((s) => toDiagramStation(s, "central"));
}

async function LiveCentralDiagram() {
  const stations = await getCentralRouteStations();
  const styles = getLineInlineStyles("central");
  const lineColor = styles.backgroundColor || "#DC241F";

  const journey =
    sliceJourney(
      stations,
      stations.find((s) => /liverpool/i.test(s.name))?.id ?? "",
      stations.find((s) => /oxford/i.test(s.name))?.id ?? "",
    ) ??
    (stations.length >= 6
      ? {
          from: stations[1]!,
          to: stations[Math.min(8, stations.length - 2)]!,
          intermediates: stations.slice(2, Math.min(8, stations.length - 2)),
        }
      : null);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Full line · live Central</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Ordered stops from{" "}
          <code className="rounded bg-muted px-1 text-xs">
            line.getRouteSequence
          </code>
          . Interchange rings when a stop serves multiple lines; mid-route
          ticks sit on the right of the line; terminals use a full crossbar.
        </p>
        <div className="max-h-[28rem] overflow-y-auto pr-2">
          <LineRouteDiagram
            stations={stations}
            lineColor={lineColor}
            lineName="Central line"
            directionLabel="Outbound"
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {stations.length} stops ·{" "}
          <Link href="/route?lineId=central&direction=outbound" className="underline">
            raw sequence
          </Link>
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Journey A→B · expandable</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Endpoints stay visible; tap to expand intermediate stops.
        </p>
        {journey ? (
          <JourneyDiagram
            from={journey.from}
            to={journey.to}
            intermediates={journey.intermediates}
            lineColor={lineColor}
            lineName="Central line"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Could not resolve a sample journey on this sequence.
          </p>
        )}
      </section>
    </div>
  );
}

const DiagramSkeleton = () => (
  <div className="grid gap-8 lg:grid-cols-2">
    <Skeleton className="h-96 w-full" />
    <Skeleton className="h-64 w-full" />
  </div>
);

export default function LineDiagramPage() {
  const journey = sliceJourney(
    VICTORIA_SAMPLE,
    "finsbury",
    "victoria",
  )!;

  return (
    <div className={cn("space-y-10", DIAGRAM_SCALE_CLASS)}>
      <div>
        <h1 className="text-3xl font-bold">Line diagram</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Useful components for drawing a route with every station (vertical or
          horizontal), and for showing a trip from A to B with expandable
          intermediates. Geometry follows{" "}
          <em>{LINE_DIAGRAM_SOURCE.title}</em> Issue{" "}
          {LINE_DIAGRAM_SOURCE.issue}. All demos on this page inherit one{" "}
          <code className="rounded bg-muted px-1 text-xs">
            {DIAGRAM_SCALE_VAR}
          </code>{" "}
          so ticks, rings, and type stay in proportion across breakpoints.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Horizontal line (sample)</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Simplified §10 strip — Victoria southbound with horizontal names and
          interchange flag blocks under each stop. Desktop scale matches the
          reference baseline ({DIAGRAM_BASELINE.horizontal}px line). Scroll
          sideways on narrow viewports.
        </p>
        <div
          className="overflow-x-auto overscroll-x-contain pb-2 [-webkit-overflow-scrolling:touch]"
          tabIndex={0}
          role="region"
          aria-label="Victoria line horizontal diagram"
        >
          <HorizontalLineDiagram
            stations={VICTORIA_HORIZONTAL}
            lineColor={victoriaBlue}
            lineName="Victoria line"
          />
        </div>
        <pre className="mt-4 overflow-x-auto rounded bg-muted p-3 text-xs text-foreground">
          {`import { DIAGRAM_SCALE_CLASS } from "@/lib/tfl/brand";
import { HorizontalLineDiagram } from "@/components/tfl/horizontal-line-diagram";

<div className={DIAGRAM_SCALE_CLASS}>
  <div className="overflow-x-auto">
    <HorizontalLineDiagram
      lineName="Victoria line"
      lineColor="#039BE5"
      stations={[{ id, name, interchange?, connections? }, …]}
    />
  </div>
</div>`}
        </pre>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Journey A→B (sample)</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Victoria line · Finsbury Park → Victoria. Collapse/expand the stops
          in between. Shares the same page scale as the horizontal strip.
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
          {`import { JourneyDiagram } from "@/components/tfl/journey-diagram";

<JourneyDiagram
  lineName="Victoria line"
  lineColor="#039BE5"
  from={{ id: "finsbury", name: "Finsbury Park", interchange: true }}
  to={{ id: "victoria", name: "Victoria", interchange: true }}
  intermediates={[/* … */]}
/>`}
        </pre>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Full line with names (sample)</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Every stop on the spine — right-side ticks for ordinary stops,
          full crossbars at terminals, rings for interchanges. Station names
          use §11 scale (taller than the rings); journey A→B views always use
          circles.
        </p>
        <div className="max-h-[22rem] max-w-md overflow-y-auto pr-2">
          <LineRouteDiagram
            stations={VICTORIA_SAMPLE}
            lineColor={victoriaBlue}
            lineName="Victoria line"
            directionLabel="Southbound"
          />
        </div>
        <pre className="mt-4 overflow-x-auto rounded bg-muted p-3 text-xs text-foreground">
          {`import { LineRouteDiagram } from "@/components/tfl/line-route-diagram";

<LineRouteDiagram
  lineName="Victoria line"
  lineColor="#039BE5"
  stations={[{ id, name, interchange?, connections? }, …]}
/>`}
        </pre>
      </section>

      <Suspense fallback={<DiagramSkeleton />}>
        <LiveCentralDiagram />
      </Suspense>

      <aside className="space-y-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Standards & helpers</p>
        <p>
          Scale with{" "}
          <code className="rounded bg-muted px-1 text-xs">
            {DIAGRAM_SCALE_VAR}
          </code>{" "}
          /{" "}
          <code className="rounded bg-muted px-1 text-xs">
            DIAGRAM_SCALE_CLASS
          </code>
          . Ratios stay in{" "}
          <code className="rounded bg-muted px-1 text-xs">LINE_DIAGRAM</code>{" "}
          (tick {LINE_DIAGRAM.stationTick}x, interchange Ø{" "}
          {LINE_DIAGRAM.interchange.outerDiameter}x, bend R
          {LINE_DIAGRAM.innerCurveRadius}x, …) — do not theme those
          independently. Map live stops with{" "}
          <code className="rounded bg-muted px-1 text-xs">toDiagramStation</code>
          {" / "}
          <code className="rounded bg-muted px-1 text-xs">sliceJourney</code>.
          See{" "}
          <code className="rounded bg-muted px-1 text-xs">
            docs/design-system.md
          </code>
          .
        </p>
      </aside>
    </div>
  );
}
