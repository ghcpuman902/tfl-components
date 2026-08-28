import type { Metadata } from "next"
import { Suspense } from "react"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { WipNotice } from "@/components/docs/wip-notice"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { RelationshipBadges } from "@/components/docs/relationship-badges"
import { DataSourceLabel } from "@/components/docs/data-source-label"
import { WeekAheadSection } from "@/components/tfl/week-ahead/week-ahead-section"
import { WeekAheadSkeleton } from "@/components/tfl/week-ahead/week-ahead-skeleton"
import { getDocsEntry } from "@/lib/docs-catalog"
import { docsEntryMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = docsEntryMetadata("week-ahead")

export default function WeekAheadLabPage() {
  const entry = getDocsEntry("week-ahead")!

  return (
    <div className="w-full min-w-0 space-y-8">
      <DocsReadableWidth>
        <article className="space-y-6">
          <DocsPageHeader
            entry={entry}
            notice={
              <WipNotice className="mt-3">
                This view is experimental and may change before version 1.0.
              </WipNotice>
            }
          />
        </article>
      </DocsReadableWidth>

      <div className="w-full max-w-full min-w-0 overflow-x-clip px-0">
        <Suspense fallback={<WeekAheadSkeleton />}>
          <WeekAheadSection />
        </Suspense>
        <DataSourceLabel source="cached" className="mt-3 px-4" />
      </div>

      <DocsReadableWidth>
        <div className="space-y-6 border-t border-border pt-8">
          <section className="space-y-2" aria-labelledby="week-ahead-reading">
            <h2 id="week-ahead-reading" className="tfl-title text-xl">
              Reading the week
            </h2>
            <p className="max-w-prose text-muted-foreground">
              Disrupted stations and route sections are marked against each
              line&apos;s usual shape. This keeps the service change tied to the
              part of the route it affects.
            </p>
          </section>
          <RelationshipBadges
            builtWith={entry.builtWith}
            usesFoundations={entry.usesFoundations}
          />
        </div>
      </DocsReadableWidth>
    </div>
  )
}
