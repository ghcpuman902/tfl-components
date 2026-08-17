import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { InstallCommand } from "@/components/docs/install-command";
import { CompactInstallButton } from "@/components/docs/compact-install-button";
import { SyntaxHighlightedCode } from "@/components/docs/syntax-highlighted-code";
import { DataSourceLabel } from "@/components/docs/data-source-label";
import { RelationshipBadges } from "@/components/docs/relationship-badges";
import { MapBusGeoDemo } from "@/components/docs/map-bus-geo-lazy";
import {
  getDocsEntry,
  getUsedBySlugs,
  type DocsEntry,
} from "@/lib/docs-catalog";
import {
  getCachedBusRouteGeometry,
  type BusRouteDirection,
} from "@/lib/tfl/bus-route-geometry";
import { BUS_ROUTE_DIVERSION_DEMO } from "@/lib/tfl/fixtures/bus-route-diversion-demo";

const PREVIEW_BUS_ROUTE_ID = "1";
const SUPERLOOP_ROUTE_ID = "sl1";
const PREVIEW_BUS_DIRECTION: BusRouteDirection = "outbound";

export const metadata: Metadata = {
  title: "Map – Bus (Geo)",
  description: "A geographic map of one bus route.",
};

const USAGE_SNIPPET = `import { TflBusGeoMap } from "@/components/tfl/geography/tfl-bus-geo-map"

<div className="h-100">
  <TflBusGeoMap data={route} />
</div>`;

const SHAPE_SNIPPET = `type BusRouteGeometry = {
  routeId: string
  direction: "inbound" | "outbound"
  color: string
  stops: { id: string; name: string; lat: number; lon: number; sequence: number }[]
  segments: { id: string; status: "current" | "diverted" | "disabled"; line: LineString }[]
}`;

const LiveBusRoutePreview = async ({
  routeId,
}: {
  routeId: string;
}) => {
  const data = await getCachedBusRouteGeometry(
    routeId,
    PREVIEW_BUS_DIRECTION,
  );
  return <MapBusGeoDemo data={data} />;
};

const MapPreviewFallback = () => (
  <div
    className="h-[min(70vh,32rem)] animate-pulse rounded-lg bg-muted"
    aria-hidden
  />
);

export default function MapBusGeoPage() {
  const entry = getDocsEntry("maps-bus");
  if (!entry) notFound();

  return (
    <DocsReadableWidth>
      <article className="space-y-14">
        <DocsPageHeader entry={entry as DocsEntry} />
        <RelationshipBadges
          usesFoundations={entry.usesFoundations}
          usedBy={getUsedBySlugs(entry.slug)}
        />

        <section className="space-y-3" aria-labelledby="preview-heading">
          <h2 id="preview-heading" className="text-lg font-semibold">
            Preview
          </h2>
          <Suspense fallback={<MapPreviewFallback />}>
            <LiveBusRoutePreview routeId={PREVIEW_BUS_ROUTE_ID} />
          </Suspense>
          <DataSourceLabel source="cached" />
        </section>

        <section className="space-y-2" aria-labelledby="usage-heading">
          <h2 id="usage-heading" className="text-lg font-semibold">
            Usage
          </h2>
          <SyntaxHighlightedCode
            code={USAGE_SNIPPET}
            language="tsx"
            peekLines={4}
          />
        </section>

        {entry.registryUrl ? (
          <section className="space-y-4" aria-labelledby="install-heading">
            <CompactInstallButton registryUrl={entry.registryUrl} />
            <h2 id="install-heading" className="text-lg font-semibold">
              Installation
            </h2>
            <InstallCommand registryUrl={entry.registryUrl} />
          </section>
        ) : null}

        <section className="space-y-3" aria-labelledby="getting-data-heading">
          <h2 id="getting-data-heading" className="text-lg font-semibold">
            Getting the data
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Pass a normalised{" "}
            <code className="text-xs">BusRouteGeometry</code>. Live sequences
            come from{" "}
            <code className="text-xs">tfl.line.getRouteSequence</code> for one
            route id. This map does not fetch.
          </p>
          <SyntaxHighlightedCode
            code={SHAPE_SNIPPET}
            language="ts"
            peekLines={6}
          />
        </section>

        <section className="space-y-3" aria-labelledby="superloop-heading">
          <h2 id="superloop-heading" className="text-lg font-semibold">
            Superloop
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Superloop sequences can repeat the same polyline and list two
            termini on one spine. Deduplicate{" "}
            <code className="text-xs">lineStrings</code> and keep every unique
            stop.
          </p>
          <Suspense fallback={<MapPreviewFallback />}>
            <LiveBusRoutePreview routeId={SUPERLOOP_ROUTE_ID} />
          </Suspense>
          <DataSourceLabel source="cached" />
        </section>

        <section className="space-y-3" aria-labelledby="render-heading">
          <h2 id="render-heading" className="text-lg font-semibold">
            Render
          </h2>
          <p className="max-w-prose text-muted-foreground">
            <code className="text-xs">current</code> is a solid bus-red line.{" "}
            <code className="text-xs">diverted</code> is dashed.{" "}
            <code className="text-xs">disabled</code> is greyed. The caller
            decides which segment is which — this is not live disruption data.
          </p>
          <Suspense fallback={<MapPreviewFallback />}>
            <MapBusGeoDemo data={BUS_ROUTE_DIVERSION_DEMO} />
          </Suspense>
          <DataSourceLabel source="fixture" />
        </section>

        <section className="space-y-2 border-t border-border pt-8">
          <h2 id="in-code" className="text-lg font-semibold">
            In code
          </h2>
          <p className="text-sm text-muted-foreground">
            <Link
              href="/docs/map-geographic"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Map – Tube &amp; Rail (Geo)
            </Link>
            {" · "}
            <Link
              href="/docs/live-bus-vehicles"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Live buses
            </Link>
            {" · "}
            <Link
              href="/docs/colors"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Colours
            </Link>
          </p>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
