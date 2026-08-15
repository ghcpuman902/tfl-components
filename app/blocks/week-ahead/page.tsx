import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { RelationshipBadges } from "@/components/docs/relationship-badges";
import { DataSourceLabel } from "@/components/docs/data-source-label";
import { WeekAheadSection } from "@/components/tfl/week-ahead/week-ahead-section";
import { WeekAheadSkeleton } from "@/components/tfl/week-ahead/week-ahead-skeleton";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Week ahead",
  description:
    "Block: compose status data with schematic line strips for the week ahead.",
};

export default function WeekAheadBlockPage() {
  const entry = getDocsEntry("week-ahead")!;

  return (
    <div className="w-full min-w-0 space-y-8">
      <DocsReadableWidth>
        <article className="space-y-6">
          <DocsPageHeader entry={entry} />
          <RelationshipBadges
            builtWith={entry.builtWith}
            usesFoundations={entry.usesFoundations}
          />
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              A <strong className="font-medium text-foreground">Block</strong> —
              not a single registry component. Composition boundary:
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                This Block owns the week and day-selection experience.
              </li>
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
                  href="/docs/branch-strip"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Branch strip
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

      <div className="w-full min-w-0 max-w-full overflow-x-clip px-0">
        <Suspense fallback={<WeekAheadSkeleton />}>
          <WeekAheadSection />
        </Suspense>
        <DataSourceLabel source="cached" className="mt-3 px-4" />
      </div>
    </div>
  );
}
