import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { GeographicMapPlaceholder } from "@/components/tfl/maps/geographic-map-placeholder";
import { Badge } from "@/components/ui/badge";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Geographic maps",
  description:
    "Real London geography — MapLibre placeholder over vendored OSM transit geometry (Tube, Elizabeth, Overground, DLR, Tram).",
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
          <Badge variant="secondary">MapLibre adapter (placeholder)</Badge>
        </div>

        <section className="space-y-2" aria-labelledby="purpose-heading">
          <h2 id="purpose-heading" className="text-lg font-semibold">
            Purpose
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Represent actual London geography with real coordinates. Core
            geometry is provider-independent GeoJSON under{" "}
            <code className="text-xs">data/geography/</code>; MapLibre is only a
            renderer adapter for this placeholder.
          </p>
        </section>

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
            <GeographicMapPlaceholder />
          </Suspense>
        </section>

        <section className="space-y-2" aria-labelledby="data-heading">
          <h2 id="data-heading" className="text-lg font-semibold">
            Data
          </h2>
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
              <code className="text-xs">data/geography/ORIGIN.md</code>
            </li>
          </ul>
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
