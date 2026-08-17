import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { SyntaxHighlightedCode } from "@/components/docs/syntax-highlighted-code";
import { RelationshipBadges } from "@/components/docs/relationship-badges";
import { VehicleProgressDemo } from "@/components/docs/vehicle-progress-lazy";
import {
  getDocsEntry,
  getUsedBySlugs,
  type DocsEntry,
} from "@/lib/docs-catalog";
import { vehicleProgressExampleVehicles } from "@/lib/tfl/vehicle-progress-examples";

export const metadata: Metadata = {
  title: "Vehicle progress",
  description:
    "Place a vehicle between two stops from a 0–1 progress value.",
};

const USAGE_SNIPPET = `const progress = progressBetweenStops(timeToNext, timeToFollowing)
const point = pointBetweenStations({ from, to, progress, polylines })

<TflGeographicMap lineIds={["victoria"]} vehicles={[{
  vehicleId: "demo",
  lineId: "victoria",
  lat: point.lat,
  lon: point.lon,
  bearingDeg: point.bearingDeg,
  destinationName: "Brixton",
  timeToNextStationSec: timeToNext,
}]} />`;

const PROGRESS_SNIPPET = `progressBetweenStops(30, 90) // 0.5
progressBetweenStops(40)     // 0 — only the next stop is known`;

export default function VehicleProgressPage() {
  const entry = getDocsEntry("vehicle-progress");
  if (!entry) notFound();
  const vehicles = vehicleProgressExampleVehicles();

  return (
    <DocsReadableWidth>
      <article className="space-y-14">
        <DocsPageHeader entry={entry as DocsEntry} />
        <RelationshipBadges
          builtWith={entry.builtWith}
          usesFoundations={entry.usesFoundations}
          usedBy={getUsedBySlugs(entry.slug)}
        />

        <section className="space-y-3" aria-labelledby="preview-heading">
          <h2 id="preview-heading" className="text-lg font-semibold">
            Preview
          </h2>
          <Suspense
            fallback={
              <div
                className="h-[min(70vh,32rem)] animate-pulse rounded-lg bg-muted"
                aria-hidden
              />
            }
          >
            <VehicleProgressDemo vehicles={vehicles} />
          </Suspense>
        </section>

        <section className="space-y-2" aria-labelledby="usage-heading">
          <h2 id="usage-heading" className="text-lg font-semibold">
            Usage
          </h2>
          <SyntaxHighlightedCode
            code={USAGE_SNIPPET}
            language="tsx"
            peekLines={5}
          />
        </section>

        <section className="space-y-3" aria-labelledby="getting-data-heading">
          <h2 id="getting-data-heading" className="text-lg font-semibold">
            Getting the data
          </h2>
          <p className="max-w-prose text-muted-foreground">
            TfL arrivals have no coordinates.{" "}
            <code className="text-xs">line.getArrivals</code> gives{" "}
            <code className="text-xs">timeToStation</code> at each stop. Two
            times on the same <code className="text-xs">vehicleId</code> become
            a 0–1 progress value.
          </p>
          <SyntaxHighlightedCode
            code={PROGRESS_SNIPPET}
            language="ts"
            peekLines={2}
          />
        </section>

        <section className="space-y-3" aria-labelledby="render-heading">
          <h2 id="render-heading" className="text-lg font-semibold">
            Render
          </h2>
          <p className="max-w-prose text-muted-foreground">
            <code className="text-xs">pointBetweenStations</code> takes that
            progress plus two station coordinates and optional route
            polylines. Pass the point as a{" "}
            <code className="text-xs">vehicles</code> row on{" "}
            <Link
              href="/docs/map-geographic"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Map – Tube &amp; Rail (Geo)
            </Link>{" "}
            or{" "}
            <Link
              href="/docs/map-bus-geo"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Map – Bus (Geo)
            </Link>
            .
          </p>
        </section>

        <section className="space-y-2 border-t border-border pt-8">
          <h2 id="in-code" className="text-lg font-semibold">
            In code
          </h2>
          <p className="text-sm text-muted-foreground">
            <Link
              href="/blocks/live-vehicles"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Live vehicles
            </Link>
            {" · "}
            <Link
              href="/docs/map-geographic"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Map – Tube &amp; Rail (Geo)
            </Link>
            {" · "}
            <Link
              href="/docs/map-bus-geo"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Map – Bus (Geo)
            </Link>
          </p>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
