import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { SyntaxHighlightedCode } from "@/components/docs/syntax-highlighted-code";
import { RelationshipBadges } from "@/components/docs/relationship-badges";
import { LiveRailVehiclesDemo } from "@/components/docs/live-vehicle-tracking-lazy";
import {
  getDocsEntry,
  getUsedBySlugs,
  type DocsEntry,
} from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Live Tube & Rail vehicles",
  description:
    "Place trains on the geographic map from arrival countdowns.",
};

const USAGE_SNIPPET = `<LiveRailVehicles
  railLineIds={["victoria", "northern"]}
  targetRequestsPerMinute="max"
/>`;

const DATA_SNIPPET = `const arrivals = await client.line.getArrivals({
  lineIds: ["victoria", "northern"],
})

const point = positionBehindStop({
  nextStop,
  remainingKm: hopKm * (timeToStation / hopSeconds),
  fromStopId,
  toStopId,
  polylines, // unique-track hop between those stops
})`;

export default function LiveRailVehiclesPage() {
  const entry = getDocsEntry("live-vehicle-tracking");
  if (!entry) notFound();

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
            TfL arrivals have no coordinates —{" "}
            <code className="text-xs">line.getArrivals</code> only gives a{" "}
            <code className="text-xs">timeToStation</code> countdown. One call
            covers every tracked line. The tracker locks each train to the
            unique-track hop between the previous and next stop, then walks
            it forward as the countdown runs.
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
            Pass the line ids you want. A simple corridor uses hop-lock;
            a junctioned line uses branch-aware placement. Paint goes through{" "}
            <Link
              href="/docs/map-geographic"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Map – Tube &amp; Rail (Geo)
            </Link>
            . Buses are a separate component —{" "}
            <Link
              href="/docs/live-bus-vehicles"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Live buses
            </Link>
            .
          </p>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
