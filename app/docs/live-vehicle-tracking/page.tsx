import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { SyntaxHighlightedCode } from "@/components/docs/syntax-highlighted-code"
import { RelationshipBadges } from "@/components/docs/relationship-badges"
import { LiveRailVehiclesDemo } from "@/components/docs/live-vehicle-tracking-lazy"
import {
  getDocsEntry,
  getUsedBySlugs,
  type DocsEntry,
} from "@/lib/docs-catalog"
import { docsEntryMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = docsEntryMetadata("live-vehicle-tracking")

const USAGE_SNIPPET = `<LiveRailVehicles
  railLineIds={["victoria", "northern"]}
  targetRequestsPerMinute="max"
/>`

const DATA_SNIPPET = `const tracker = new RailTrainTracker()

// Keep the same tracker across updates.
const vehicles = tracker.ingest(arrivals, receivedAt)`

export default function LiveRailVehiclesPage() {
  const entry = getDocsEntry("live-vehicle-tracking")
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
            <LiveRailVehiclesDemo />
          </Suspense>
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

        <section className="space-y-3" aria-labelledby="getting-data-heading">
          <h2 id="getting-data-heading" className="text-lg font-semibold">
            Getting the data
          </h2>
          <p className="max-w-prose text-muted-foreground">
            TfL provides arrival predictions, not live train coordinates.
            Positions are estimates, using the reported location, feed
            timestamps and station order. The tracker fits recent observations
            along the track and learns inter-station run times as trains reach
            platforms.
          </p>
          <SyntaxHighlightedCode
            code={DATA_SNIPPET}
            language="ts"
            peekLines={8}
          />
        </section>

        <section className="space-y-3" aria-labelledby="render-heading">
          <h2 id="render-heading" className="text-lg font-semibold">
            Render
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Trains move along a schematic route. They slow down or wait when a
            new estimate falls behind the displayed position. Delayed or missing
            reports can still leave a train at the wrong place. Pause the map to
            inspect it; reduced-motion settings show position updates without
            continuous travel.
          </p>
        </section>
      </article>
    </DocsReadableWidth>
  )
}
