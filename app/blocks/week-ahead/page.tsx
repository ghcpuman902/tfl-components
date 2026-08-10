import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
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
        <DocsPageHeader entry={entry} />
        <p className="max-w-prose text-sm text-muted-foreground">
          A <strong className="font-medium text-foreground">Block</strong>{" "}
          (shadcn-style): not a single registry component, but a composition of
          data-aware status interpretation and schematic{" "}
          <Link
            href="/primitives/line-strip"
            className="text-primary underline-offset-4 hover:underline"
          >
            line strip
          </Link>{" "}
          primitives. Also featured on the{" "}
          <Link href="/" className="text-primary underline-offset-4 hover:underline">
            home page
          </Link>
          .
        </p>
      </DocsReadableWidth>

      <div className="w-full min-w-0 max-w-full overflow-x-clip px-0">
        <Suspense fallback={<WeekAheadSkeleton />}>
          <WeekAheadSection />
        </Suspense>
      </div>
    </div>
  );
}
