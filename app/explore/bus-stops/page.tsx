import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { ExploreWipNotice } from "@/components/docs/explore-wip-notice";
import { BusArrivals } from "@/components/tfl/arrivals/bus-arrivals";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Bus stops",
  description:
    "Find bus stops near you or by name, then inspect live arrivals.",
};

export default async function ExploreBusStopsPage() {
  const entry = getDocsEntry("bus-stops");
  if (!entry) notFound();

  const { default: MDXPage } = await import("@/content/explore/bus-stops.mdx");

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <ExploreWipNotice />
        <DocsPageHeader entry={entry} />
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Purpose</h2>
          <p className="max-w-prose text-muted-foreground">
            Discover stop points (geolocation or search) and preview how
            normalised arrivals render on{" "}
            <Link
              href="/docs/bus-arrivals"
              className="text-foreground underline underline-offset-4"
            >
              Bus Arrivals
            </Link>
            . This is Explorer composition chrome — not the installable board
            API.
          </p>
        </section>
        <BusArrivals />
        <section className="border-t border-border pt-8">
          <Suspense fallback={null}>
            <MDXPage />
          </Suspense>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
