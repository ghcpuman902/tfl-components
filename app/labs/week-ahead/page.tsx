import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { WipNotice } from "@/components/docs/wip-notice"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { RelationshipBadges } from "@/components/docs/relationship-badges"
import { DataSourceLabel } from "@/components/docs/data-source-label"
import { WeekAheadSection } from "@/components/tfl/week-ahead/week-ahead-section"
import { WeekAheadSkeleton } from "@/components/tfl/week-ahead/week-ahead-skeleton"
import { getDocsEntry } from "@/lib/docs-catalog"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = pageMetadata({
  title: "Week ahead",
  description:
    "Compose status data with schematic line strips for the week ahead.",
  path: "/labs/week-ahead",
})

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
                Labs is experimental. More examples will follow.
              </WipNotice>
            }
          />
          <RelationshipBadges
            builtWith={entry.builtWith}
            usesFoundations={entry.usesFoundations}
          />
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              A <strong className="font-medium text-foreground">Lab</strong> —
              not a single registry component. Composition boundary:
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>This Lab owns the week and day-selection experience.</li>
              <li>
                Data-aware status interpretation consumes normalised service
                information (same family as{" "}
                <Link
                  href="/docs/tube-rail-status"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Status board
                </Link>
                ).
              </li>
              <li>
                <Link
                  href="/docs/line-strip"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Line strip
                </Link>{" "}
                and{" "}
                <Link
                  href="/docs/branch-strip-horizontal"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Branch strip — horizontal
                </Link>
                {" / "}
                <Link
                  href="/docs/branch-strip-vertical"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  vertical
                </Link>{" "}
                render schematic routes.
              </li>
              <li>
                Disabled stations and segment states remain reusable rendering
                capabilities on the strip primitives — install those
                independently if you only need diagrams.
              </li>
            </ul>
          </div>
        </article>
      </DocsReadableWidth>

      <div className="w-full max-w-full min-w-0 overflow-x-clip px-0">
        <Suspense fallback={<WeekAheadSkeleton />}>
          <WeekAheadSection />
        </Suspense>
        <DataSourceLabel source="cached" className="mt-3 px-4" />
      </div>
    </div>
  )
}
