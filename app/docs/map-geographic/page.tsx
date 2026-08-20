import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { InstallCommand } from "@/components/docs/install-command"
import { CompactInstallButton } from "@/components/docs/compact-install-button"
import { SyntaxHighlightedCode } from "@/components/docs/syntax-highlighted-code"
import { DataSourceLabel } from "@/components/docs/data-source-label"
import { RelationshipBadges } from "@/components/docs/relationship-badges"
import {
  getDocsEntry,
  getUsedBySlugs,
  type DocsEntry,
} from "@/lib/docs-catalog"
import {
  MAPLIBRE_EXAMPLE,
  LEAFLET_EXAMPLE,
  MAPBOX_EXAMPLE,
  GOOGLE_MAPS_EXAMPLE,
} from "@/components/docs/vendor-maps/vendor-code-examples"
import {
  MapGeographicDemo,
  MapLibreExample,
  LeafletExample,
  MapboxExample,
  GoogleMapsExample,
} from "@/components/docs/map-geographic-lazy"
import uniqueTrackManifest from "@/data/geography/unique-track/manifest.json"

export const metadata: Metadata = {
  title: "Map – Tube & Rail (Geo)",
  description:
    "Track geometry as GeoJSON for Tube, Elizabeth, Overground, DLR, and Tram. Use the packaged MapLibre map, or draw the same files in your own SDK.",
}

const USAGE_SNIPPET = `import { TflGeographicMap } from "@/components/tfl/geography/tfl-geographic-map"

<div className="h-100">
  <TflGeographicMap />
</div>

<TflGeographicMap modes={["tube", "elizabeth"]} showStations={false} />
<TflGeographicMap trackModel="dual" />`

const BUNDLE_SNIPPET = `type TransitGeometryBundle = {
  lines: FeatureCollection<LineString, {
    featureId: string   // "elizabeth-track-0"
    lineId: string      // "victoria"
    lineName: string    // "Victoria line"
    color: string       // "#0098D4"
    trackGroup?: 0 | 1  // dual layer only
    towards?: string    // dual layer only
  }>
  stations: FeatureCollection<Point, {
    featureId: string   // "940GZZLUBST"
    name: string        // "Baker Street Underground Station"
    label: string       // "Baker Street"
    lineIds: string[]   // ["bakerloo", "circle", ...]
    zone?: string       // "1"
  }>
}`

const ExternalTextLink = ({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) => (
  <a
    href={href}
    className="text-foreground underline underline-offset-4"
    target="_blank"
    rel="noopener noreferrer"
  >
    {children}
  </a>
)

export default function MapsGeographicPage() {
  const entry = getDocsEntry("maps-geographic")
  if (!entry) notFound()

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
          <DataSourceLabel source="cached" />
          <p className="max-w-prose text-sm text-muted-foreground">
            MapLibre GL JS on OpenFreeMap Positron (vector). No API key. Station
            names appear as you zoom.
          </p>
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
            <p className="max-w-prose text-sm text-muted-foreground">
              This copies the component, types, and credit helpers. The GeoJSON
              still has to live somewhere your app can fetch. Copy{" "}
              <code className="text-xs">public/data/geography/*.json</code> into
              the project, or host those files on a CDN.
            </p>
          </section>
        ) : null}

        <section className="space-y-4" aria-labelledby="geometry-heading">
          <h2 id="geometry-heading" className="text-lg font-semibold">
            Unique corridors, not every variant
          </h2>
          <p className="max-w-prose text-muted-foreground">
            OpenStreetMap stores each timetable pattern as its own route. Paint
            all of them and the Elizabeth line stacks 24 times on the same
            tracks.
          </p>
          <p className="max-w-prose text-muted-foreground">
            The map draws unique track: directional twins merged into one
            centreline, real branches kept, junctions welded to a shared vertex.
            Toggle Both tracks in the preview for each direction as its own
            polyline.{" "}
            <code className="text-xs">
              /data/geography/{"{mode}"}-graph.json
            </code>{" "}
            is the same network as nodes and edges. Full OSM variants stay in
            the repo for analysis — do not put them on the map.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pr-4 pb-2 font-medium">File</th>
                  <th className="pr-4 pb-2 font-medium">Centreline</th>
                  <th className="pr-4 pb-2 font-medium">Both tracks</th>
                  <th className="pr-4 pb-2 font-medium">OSM variants</th>
                  <th className="pr-4 pb-2 font-medium">Stations</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {uniqueTrackManifest.modes.map((row, index) => (
                  <tr
                    key={row.mode}
                    className={
                      index < uniqueTrackManifest.modes.length - 1
                        ? "border-b border-border/50"
                        : undefined
                    }
                  >
                    <td className="py-2 pr-4">
                      <code className="text-xs">{row.mode}-geometry.json</code>
                    </td>
                    <td className="py-2 pr-4">{row.fullLines}</td>
                    <td className="py-2 pr-4">{row.dualFullLines}</td>
                    <td className="py-2 pr-4">{row.variantLines}</td>
                    <td className="py-2 pr-4">{row.stations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="max-w-prose text-sm text-muted-foreground">
            <code className="text-xs">all-stations.json</code> is the same 456
            stations with merged line ids. Rebuild unique-track with{" "}
            <code className="text-xs">pnpm geography:unique-track</code>.
          </p>

          <SyntaxHighlightedCode
            code={BUNDLE_SNIPPET}
            language="ts"
            peekLines={5}
          />
        </section>

        <section className="space-y-3" aria-labelledby="map-next-heading">
          <h2 id="map-next-heading" className="text-lg font-semibold">
            Related
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Bus routes are a separate map — they come from TfL route sequences,
            not these vendored rail files. See{" "}
            <Link
              href="/docs/map-bus-geo"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Map – Bus (Geo)
            </Link>
            . Pass derived dots as <code className="text-xs">vehicles</code> —{" "}
            <Link
              href="/docs/live-vehicle-tracking"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Live Tube &amp; Rail vehicles
            </Link>{" "}
            places them.
          </p>
        </section>

        <section className="space-y-8" aria-labelledby="vendors-heading">
          <div className="space-y-2">
            <h2 id="vendors-heading" className="text-lg font-semibold">
              Draw it in your own map
            </h2>
            <p className="max-w-prose text-muted-foreground">
              The files are GeoJSON. MapLibre and Leaflet need no key. Mapbox
              and Google Maps need a token from your project.
            </p>
          </div>

          <article className="space-y-3">
            <h3 id="vendor-maplibre" className="text-xl font-medium">
              MapLibre GL JS
            </h3>
            <Suspense
              fallback={
                <div
                  className="h-80 animate-pulse rounded-lg bg-muted"
                  aria-hidden
                />
              }
            >
              <MapLibreExample />
            </Suspense>
            <SyntaxHighlightedCode
              code={MAPLIBRE_EXAMPLE}
              language="tsx"
              peekLines={5}
            />
          </article>

          <article className="space-y-3">
            <h3 id="vendor-leaflet" className="text-xl font-medium">
              Leaflet
            </h3>
            <Suspense
              fallback={
                <div
                  className="h-80 animate-pulse rounded-lg bg-muted"
                  aria-hidden
                />
              }
            >
              <LeafletExample />
            </Suspense>
            <SyntaxHighlightedCode
              code={LEAFLET_EXAMPLE}
              language="tsx"
              peekLines={5}
            />
          </article>

          <article className="space-y-3">
            <h3 id="vendor-mapbox" className="text-xl font-medium">
              Mapbox GL JS
            </h3>
            <p className="max-w-prose text-sm text-muted-foreground">
              Needs a public access token.
            </p>
            <Suspense
              fallback={
                <div
                  className="h-80 animate-pulse rounded-lg bg-muted"
                  aria-hidden
                />
              }
            >
              <MapboxExample />
            </Suspense>
            <SyntaxHighlightedCode
              code={MAPBOX_EXAMPLE}
              language="tsx"
              peekLines={5}
            />
          </article>

          <article className="space-y-3">
            <h3 id="vendor-google" className="text-xl font-medium">
              Google Maps
            </h3>
            <p className="max-w-prose text-sm text-muted-foreground">
              Needs a Maps JavaScript API key.
            </p>
            <Suspense
              fallback={
                <div
                  className="h-80 animate-pulse rounded-lg bg-muted"
                  aria-hidden
                />
              }
            >
              <GoogleMapsExample />
            </Suspense>
            <SyntaxHighlightedCode
              code={GOOGLE_MAPS_EXAMPLE}
              language="tsx"
              peekLines={5}
            />
          </article>
        </section>

        <section className="space-y-4" aria-labelledby="props-heading">
          <h2 id="props-heading" className="text-lg font-semibold">
            Props
          </h2>
          <p className="max-w-prose text-muted-foreground">
            <code className="text-xs">TflGeographicMap</code> fills its parent.
            Give the wrapper a height.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pr-4 pb-2 font-medium">Prop</th>
                  <th className="pr-4 pb-2 font-medium">Type</th>
                  <th className="pr-4 pb-2 font-medium">Default</th>
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
                  <td className="py-2 pr-4 font-mono text-xs">lineIds</td>
                  <td className="py-2 pr-4 text-xs">
                    <code>string[]</code>
                  </td>
                  <td className="py-2 pr-4 text-xs">all lines</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-xs">trackModel</td>
                  <td className="py-2 pr-4 text-xs">
                    <code>&quot;centreline&quot; | &quot;dual&quot;</code>
                  </td>
                  <td className="py-2 pr-4 text-xs">centreline</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-xs">vehicles</td>
                  <td className="py-2 pr-4 text-xs">
                    <code>VehiclePosition[]</code>
                  </td>
                  <td className="py-2 pr-4 text-xs">none</td>
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
                  <td className="py-2 pr-4 text-xs" />
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-2 border-t border-border pt-8">
          <h2 id="licensing" className="text-lg font-semibold">
            Track data still belongs to OSM
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Geometry is © OpenStreetMap contributors,{" "}
            <ExternalTextLink href="https://opendatacommons.org/licenses/odbl/1-0/">
              ODbL 1.0
            </ExternalTextLink>
            . Station metadata where present is © Transport for London,{" "}
            <ExternalTextLink href="https://tfl.gov.uk/info-for/open-data-users/">
              TfL Open Data
            </ExternalTextLink>
            . The Positron basemap is © OpenStreetMap contributors and ©
            OpenFreeMap. The full declaration is{" "}
            <code className="text-xs">data/geography/ORIGIN.md</code>.
          </p>
        </section>

        <section className="max-w-prose space-y-2 border-t border-border pt-8">
          <h2 id="in-code" className="text-lg font-semibold">
            In code
          </h2>
          <p className="text-sm text-muted-foreground">
            <Link
              href="/docs/map-bus-geo"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Map – Bus (Geo)
            </Link>
            {" · "}
            <Link
              href="/docs/live-vehicle-tracking"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Live Tube &amp; Rail vehicles
            </Link>
            {" · "}
            <Link
              href="/docs/cycle-hire-docks"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Cycle hire docks
            </Link>
            {" · "}
            <Link
              href="/docs/map-schematic"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Schematic &amp; network
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
  )
}
