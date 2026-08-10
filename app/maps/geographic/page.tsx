import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { DataSourceLabel } from "@/components/docs/data-source-label";
import { GeographicMapPlaceholder } from "@/components/tfl/maps/geographic-map-placeholder";
import { Badge } from "@/components/ui/badge";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Geographic maps",
  description:
    "Provider-independent GeoJSON geometry with a MapLibre demo adapter.",
};

export default function MapsGeographicPage() {
  const entry = getDocsEntry("maps-geographic");
  if (!entry) notFound();

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry} />

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Geographic</Badge>
          <Badge variant="secondary">MapLibre adapter (demo)</Badge>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Purpose</h2>
          <p className="max-w-prose text-muted-foreground">
            Real London geography with coordinates. Core geometry is
            provider-independent GeoJSON. Renderers (MapLibre, Leaflet, Google,
            …) sit above as adapters — the shared geography API must not depend
            on MapLibre.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Preview</h2>
          <DataSourceLabel source="cached" />
          <Suspense
            fallback={
              <div
                className="h-[min(70vh,32rem)] animate-pulse rounded-lg bg-muted"
                aria-hidden
              />
            }
          >
            <GeographicMapPlaceholder />
          </Suspense>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Where data comes from</h2>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            <li>
              Demo bundles:{" "}
              <code className="text-xs">
                public/data/geography/{"{tube,elizabeth,overground,dlr,tram}"}
                -geometry.json
              </code>
            </li>
            <li>
              Geometry caches:{" "}
              <code className="text-xs">
                data/geography/osm-cache/*-geometry/
              </code>
            </li>
            <li>
              Origin / licence:{" "}
              <code className="text-xs">data/geography/ORIGIN.md</code>{" "}
              (OpenStreetMap attribution required)
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">How a developer obtains data</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Consume the GeoJSON files (or regenerate caches from OSM extracts
            documented in <code className="text-xs">ORIGIN.md</code>). Pass
            FeatureCollections into your chosen renderer adapter. Do not import
            MapLibre from shared geography helpers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Renderer adapters</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            This page’s demo uses MapLibre over the vendored GeoJSON. Swap the
            adapter without changing the geometry source. Full interactive
            geographic product work continues beyond this placeholder.
          </p>
        </section>

        <p className="text-sm text-muted-foreground">
          Schematic / network maps are a different concept — see{" "}
          <Link
            href="/maps/schematic"
            className="text-primary underline-offset-4 hover:underline"
          >
            Schematic &amp; network
          </Link>
          .
        </p>
      </article>
    </DocsReadableWidth>
  );
}
