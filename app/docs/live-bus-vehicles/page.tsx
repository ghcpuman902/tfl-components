import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { SyntaxHighlightedCode } from "@/components/docs/syntax-highlighted-code"
import { RelationshipBadges } from "@/components/docs/relationship-badges"
import { LiveBusVehiclesDemo } from "@/components/docs/live-vehicle-tracking-lazy"
import {
  getDocsEntry,
  getUsedBySlugs,
  type DocsEntry,
} from "@/lib/docs-catalog"

export const metadata: Metadata = {
  title: "Live buses",
  description: "Place buses on a route map from live GPS.",
}

const USAGE_SNIPPET = `<LiveBusVehicles
  busRouteIds={["24"]}
  targetRequestsPerMinute="max"
  busPositionSource="auto"
/>`

const DATA_SNIPPET = `const activities = await fetchBodsVehicleActivities({
  boundingBox: [-0.18, 51.48, -0.10, 51.56],
})`

export default function LiveBusVehiclesPage() {
  const entry = getDocsEntry("live-bus-vehicles")
  if (!entry) notFound()

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
            <LiveBusVehiclesDemo />
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
            TfL arrivals have no bus GPS. Register on the{" "}
            <a
              href="https://data.bus-data.dft.gov.uk/account/signup/"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Bus Open Data Service
            </a>
            , set <code className="text-xs">BODS_API_KEY</code>, and poll
            SIRI-VM. Auto uses GPS when the key is present, and falls back to
            arrival countdowns when it is not.
          </p>
          <SyntaxHighlightedCode
            code={DATA_SNIPPET}
            language="ts"
            peekLines={3}
          />
        </section>

        <section className="space-y-3" aria-labelledby="render-heading">
          <h2 id="render-heading" className="text-lg font-semibold">
            Render
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Pass the route ids you want. Paint goes through{" "}
            <Link
              href="/docs/map-bus-geo"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Map – Bus (Geo)
            </Link>
            . Trains are a separate component —{" "}
            <Link
              href="/docs/live-vehicle-tracking"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Live Tube &amp; Rail vehicles
            </Link>
            .
          </p>
        </section>
      </article>
    </DocsReadableWidth>
  )
}
