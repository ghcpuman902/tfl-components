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
import { getDocsEntry, type DocsEntry } from "@/lib/docs-catalog";
import {
  MAPLIBRE_EXAMPLE,
  LEAFLET_EXAMPLE,
  MAPBOX_EXAMPLE,
  GOOGLE_MAPS_EXAMPLE,
} from "@/components/docs/vendor-maps/vendor-code-examples";

import dynamic from "next/dynamic";

const MapGeographicDemo = dynamic(
  () => import("@/components/docs/demos/map-geographic-demo"),
  { ssr: false },
);
const MapLibreExample = dynamic(
  () =>
    import("@/components/docs/vendor-maps/maplibre-example").then((m) => ({
      default: m.MapLibreExample,
    })),
  { ssr: false },
);
const LeafletExample = dynamic(
  () =>
    import("@/components/docs/vendor-maps/leaflet-example").then((m) => ({
      default: m.LeafletExample,
    })),
  { ssr: false },
);

export const metadata: Metadata = {
  title: "Map (Geographic)",
  description:
    "Provider-independent GeoJSON geometry for London transit. Install the packaged free map or bring your own renderer.",
};

export default function MapsGeographicPage() {
  const entry = getDocsEntry("maps-geographic");
  if (!entry) notFound();

  return (
    <DocsReadableWidth>
      <article className="space-y-10">
        <DocsPageHeader entry={entry as DocsEntry} />

        {/* ── Preview ── */}
        <section className="space-y-3" aria-labelledby="preview-heading">
          <h2 id="preview-heading" className="text-lg font-semibold">
            Preview
          </h2>
          <DataSourceLabel source="cached" />
          <Suspense
            fallback={
              <div
                className="h-[min(70vh,32rem)] animate-pulse rounded-lg bg-muted"
                aria-hidden
              />
            }
          >
            <MapGeographicDemo />
          </Suspense>
          <p className="text-sm text-muted-foreground">
            Default packaged map — MapLibre GL JS, CARTO Positron, no API key.
            456 stations, 304 line segments across five modes.
          </p>
        </section>

        {/* ── Usage ── */}
        <section className="space-y-2" aria-labelledby="usage-heading">
          <h2 id="usage-heading" className="text-lg font-semibold">
            Usage
          </h2>
          <SyntaxHighlightedCode
            code={`import { TflGeographicMap } from "@/components/tfl/geography/tfl-geographic-map"

// Fill parent — wrap in a sized container
<div className="h-100">
  <TflGeographicMap />
</div>

// Filter modes, hide stations
<TflGeographicMap modes={["tube", "elizabeth"]} showStations={false} />`}
            language="tsx"
            peekLines={4}
          />
        </section>

        {/* ── Install ── */}
        {entry.registryUrl && (
          <section className="space-y-4" aria-labelledby="install-heading">
            <CompactInstallButton registryUrl={entry.registryUrl} />
            <h2 id="install-heading" className="text-lg font-semibold">
              Installation
            </h2>
            <InstallCommand registryUrl={entry.registryUrl} />
            <p className="max-w-prose text-sm text-muted-foreground">
              Installs the component source, geography types, and credit helpers.
              GeoJSON data files are fetched from{" "}
              <code className="text-xs">/data/geography/</code> at runtime — copy
              the{" "}
              <code className="text-xs">public/data/geography/*.json</code>{" "}
              files into your project, or host them on a CDN.
            </p>
          </section>
        )}

        {/* ── Getting the data ── */}
        <section className="space-y-4 border-t border-border pt-8" aria-labelledby="data-heading">
          <h2 id="data-heading" className="text-lg font-semibold">
            Getting the data
          </h2>

          <p className="max-w-prose text-sm text-muted-foreground">
            Geographic geometry ships as GeoJSON FeatureCollections. Each
            per-mode bundle has a <code className="text-xs">lines</code>{" "}
            (LineString) and <code className="text-xs">stations</code> (Point)
            collection. Choose your source based on detail vs freshness needs.
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 rounded-lg border border-border p-4">
              <h3 className="font-semibold">OSM geometry (detailed)</h3>
              <p className="text-sm text-muted-foreground">
                Detailed track geometry from OpenStreetMap Overpass queries,
                enriched with TfL station metadata. Vendored in this project —
                once installed to a consumer, becomes a static snapshot.
              </p>
              <ul className="list-inside list-disc text-xs text-muted-foreground">
                <li>208 line segments, 270 stations (Tube)</li>
                <li>Five modes: Tube, Elizabeth, Overground, DLR, Tram</li>
                <li>456 unique stations total across all modes</li>
                <li>Suitable for detailed overlays on any basemap</li>
              </ul>
            </div>

            <div className="space-y-2 rounded-lg border border-border p-4">
              <h3 className="font-semibold">TfL API geometry (segments)</h3>
              <p className="text-sm text-muted-foreground">
                Stop-to-stop segments from TfL route sequence endpoints. Simpler
                geometry, more live. Low-poly look — useful for network analysis,
                not pretty overlays.
              </p>
              <ul className="list-inside list-disc text-xs text-muted-foreground">
                <li>
                  Endpoint:{" "}
                  <code className="text-[0.65rem]">
                    /Line/&#123;id&#125;/Route/Sequence/&#123;dir&#125;
                  </code>
                </li>
                <li>
                  Via{" "}
                  <code className="text-[0.65rem]">tfl-ts</code>:{" "}
                  <code className="text-[0.65rem]">
                    tfl.line.getRouteSequence()
                  </code>
                </li>
                <li>Straight segments only — no Bézier bends</li>
                <li>Shown only on the free packaged map (intentional)</li>
              </ul>
            </div>
          </div>

          <h3 className="pt-2 font-semibold">Bundle shape</h3>
          <SyntaxHighlightedCode
            code={`// Each mode bundle: { lines, stations }
type TransitGeometryBundle = {
  lines: FeatureCollection<LineString, {
    featureId: string
    lineId: string      // e.g. "victoria", "northern"
    lineName: string    // e.g. "Victoria line"
    color: string       // hex colour, e.g. "#0098D4"
    lineOffset: number
  }>
  stations: FeatureCollection<Point, {
    featureId: string   // e.g. "940GZZLUBST"
    name: string        // "Baker Street Underground Station"
    label: string       // "Baker Street"
    lineIds: string[]   // ["bakerloo", "circle", ...]
    zone?: string       // "1"
  }>
}`}
            language="ts"
            peekLines={5}
          />

          <h3 className="pt-2 font-semibold">Data files</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 font-medium">File</th>
                  <th className="pb-2 pr-4 font-medium">Lines</th>
                  <th className="pb-2 pr-4 font-medium">Stations</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">
                    <code className="text-xs">tube-geometry.json</code>
                  </td>
                  <td className="py-2 pr-4">208</td>
                  <td className="py-2 pr-4">270</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">
                    <code className="text-xs">elizabeth-geometry.json</code>
                  </td>
                  <td className="py-2 pr-4">24</td>
                  <td className="py-2 pr-4">41</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">
                    <code className="text-xs">overground-geometry.json</code>
                  </td>
                  <td className="py-2 pr-4">50</td>
                  <td className="py-2 pr-4">112</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4">
                    <code className="text-xs">dlr-geometry.json</code>
                  </td>
                  <td className="py-2 pr-4">12</td>
                  <td className="py-2 pr-4">45</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    <code className="text-xs">tram-geometry.json</code>
                  </td>
                  <td className="py-2 pr-4">10</td>
                  <td className="py-2 pr-4">38</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            Combined stations file:{" "}
            <code className="text-xs">all-stations.json</code> (456 stations,
            deduplicated with merged lineIds).
          </p>
        </section>

        {/* ── Render with your map vendor ── */}
        <section className="space-y-6 border-t border-border pt-8" aria-labelledby="vendors-heading">
          <h2 id="vendors-heading" className="text-lg font-semibold">
            Render with your map vendor
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            The geometry is provider-independent GeoJSON. Import it, then render
            with whichever map SDK your project uses. MapLibre and Leaflet work
            without API keys. Mapbox and Google Maps require tokens your project
            supplies.
          </p>

          {/* MapLibre */}
          <div className="space-y-3">
            <h3 id="vendor-maplibre" className="font-semibold">
              MapLibre GL JS{" "}
              <span className="text-xs font-normal text-muted-foreground">
                — free, no API key
              </span>
            </h3>
            <Suspense
              fallback={
                <div className="h-80 animate-pulse rounded-lg bg-muted" aria-hidden />
              }
            >
              <MapLibreExample />
            </Suspense>
            <SyntaxHighlightedCode
              code={MAPLIBRE_EXAMPLE}
              language="tsx"
              peekLines={5}
            />
          </div>

          {/* Leaflet */}
          <div className="space-y-3">
            <h3 id="vendor-leaflet" className="font-semibold">
              Leaflet{" "}
              <span className="text-xs font-normal text-muted-foreground">
                — free, no API key
              </span>
            </h3>
            <Suspense
              fallback={
                <div className="h-80 animate-pulse rounded-lg bg-muted" aria-hidden />
              }
            >
              <LeafletExample />
            </Suspense>
            <SyntaxHighlightedCode
              code={LEAFLET_EXAMPLE}
              language="tsx"
              peekLines={5}
            />
          </div>

          {/* Mapbox */}
          <div className="space-y-3">
            <h3 id="vendor-mapbox" className="font-semibold">
              Mapbox GL JS{" "}
              <span className="text-xs font-normal text-muted-foreground">
                — requires access token
              </span>
            </h3>
            <div
              className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted"
              role="img"
              aria-label="Mapbox example placeholder — requires access token"
            >
              <p className="px-4 text-center text-sm text-muted-foreground">
                Mapbox GL JS renders with the same GeoJSON. Supply your{" "}
                <code className="text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code> in
                your project.
              </p>
            </div>
            <SyntaxHighlightedCode
              code={MAPBOX_EXAMPLE}
              language="tsx"
              peekLines={5}
            />
          </div>

          {/* Google Maps */}
          <div className="space-y-3">
            <h3 id="vendor-google" className="font-semibold">
              Google Maps JavaScript API{" "}
              <span className="text-xs font-normal text-muted-foreground">
                — requires API key
              </span>
            </h3>
            <div
              className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted"
              role="img"
              aria-label="Google Maps example placeholder — requires API key"
            >
              <p className="px-4 text-center text-sm text-muted-foreground">
                Google Maps Data layer accepts GeoJSON directly. Supply your{" "}
                <code className="text-xs">NEXT_PUBLIC_GOOGLE_MAPS_KEY</code> in
                your project.
              </p>
            </div>
            <SyntaxHighlightedCode
              code={GOOGLE_MAPS_EXAMPLE}
              language="tsx"
              peekLines={5}
            />
          </div>
        </section>

        {/* ── Packaged free map ── */}
        <section className="space-y-4 border-t border-border pt-8" aria-labelledby="packaged-heading">
          <h2 id="packaged-heading" className="text-lg font-semibold">
            Packaged free map
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            <code className="text-xs">TflGeographicMap</code> is a ready-made
            MapLibre surface for consumers who want a working map without choosing
            a vendor. It auto-fills its parent container (
            <code className="text-xs">h-full w-full</code>), consistent with the
            cycle-hire map surface pattern.
          </p>

          <h3 className="font-semibold">Props</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 font-medium">Prop</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium">Default</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-xs">data</td>
                  <td className="py-2 pr-4 text-xs">
                    <code>Record&lt;TransitMode, Bundle&gt;</code>
                  </td>
                  <td className="py-2 pr-4 text-xs">fetches vendored JSON</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-xs">modes</td>
                  <td className="py-2 pr-4 text-xs">
                    <code>TransitMode[]</code>
                  </td>
                  <td className="py-2 pr-4 text-xs">all five</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-xs">showStations</td>
                  <td className="py-2 pr-4 text-xs">boolean</td>
                  <td className="py-2 pr-4 text-xs">true</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-xs">showLines</td>
                  <td className="py-2 pr-4 text-xs">boolean</td>
                  <td className="py-2 pr-4 text-xs">true</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-xs">
                    showNavigation
                  </td>
                  <td className="py-2 pr-4 text-xs">boolean</td>
                  <td className="py-2 pr-4 text-xs">true</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-xs">center</td>
                  <td className="py-2 pr-4 text-xs">
                    <code>[lng, lat]</code>
                  </td>
                  <td className="py-2 pr-4 text-xs">[-0.12, 51.51]</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-xs">zoom</td>
                  <td className="py-2 pr-4 text-xs">number</td>
                  <td className="py-2 pr-4 text-xs">10.2</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">className</td>
                  <td className="py-2 pr-4 text-xs">string</td>
                  <td className="py-2 pr-4 text-xs">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Data origin ── */}
        <section className="space-y-3 border-t border-border pt-8" aria-labelledby="origin-heading">
          <h2 id="origin-heading" className="text-lg font-semibold">
            Data origin &amp; licensing
          </h2>
          <aside
            className="space-y-1 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground"
            aria-label="Data origin"
          >
            <ul className="list-inside list-disc space-y-1">
              <li>
                © OpenStreetMap contributors · track geometry · ODbL (
                <a
                  className="underline-offset-2 hover:underline"
                  href="https://opendatacommons.org/licenses/odbl/1-0/"
                >
                  ODbL 1.0
                </a>
                )
              </li>
              <li>
                © Transport for London · station metadata where present (
                <a
                  className="underline-offset-2 hover:underline"
                  href="https://tfl.gov.uk/info-for/open-data-users/"
                >
                  TfL Open Data
                </a>
                )
              </li>
              <li>
                CARTO Positron basemap (free-tier raster tiles) © CARTO · ©
                OpenStreetMap contributors
              </li>
            </ul>
            <p className="pt-1">
              Full declaration:{" "}
              <code className="text-[0.7rem]">data/geography/ORIGIN.md</code>
            </p>
          </aside>
        </section>

        {/* ── Related ── */}
        <section className="border-t border-border pt-8" aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-lg font-semibold">
            Related
          </h2>
          <ul className="mt-3 list-inside list-disc text-sm text-muted-foreground">
            <li>
              <Link
                href="/docs/cycle-hire-docks"
                className="text-primary underline-offset-4 hover:underline"
              >
                Cycle hire docks
              </Link>{" "}
              — multi-surface MapLibre map with dock markers
            </li>
            <li>
              <Link
                href="/docs/map-schematic"
                className="text-primary underline-offset-4 hover:underline"
              >
                Schematic &amp; network
              </Link>{" "}
              — topology diagrams, not geographic
            </li>
            <li>
              <Link
                href="/docs/map-tubemap"
                className="text-primary underline-offset-4 hover:underline"
              >
                Map (TubeMap)
              </Link>{" "}
              — classic Tube map style (coming soon)
            </li>
            <li>
              <Link
                href="/docs/colors"
                className="text-primary underline-offset-4 hover:underline"
              >
                Colours
              </Link>{" "}
              — line colour tokens used in geometry features
            </li>
          </ul>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
