import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { RelationshipBadges } from "@/components/docs/relationship-badges";
import {
  LiveVehiclesFallback,
  LiveVehiclesSection,
} from "@/components/tfl/live-vehicles/live-vehicles-section";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Live vehicles",
  description:
    "Block composing geographic maps with live vehicle positions derived from line-wide arrivals.",
};

export default function LiveVehiclesBlockPage() {
  const entry = getDocsEntry("live-vehicles")!;

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
                This Block owns polling and marker motion.
              </li>
              <li>
                <Link
                  href="/docs/map-geographic"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Map – Tube &amp; Rail (Geo)
                </Link>{" "}
                paints Victoria track geometry.
              </li>
              <li>
                <Link
                  href="/docs/map-bus-geo"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Map – Bus (Geo)
                </Link>{" "}
                paints route 24 from a TfL route sequence.
              </li>
              <li>
                Positions are derived from{" "}
                <code className="text-xs">line.getArrivals</code> — TfL does
                not send vehicle coordinates.
              </li>
            </ul>
          </div>
        </article>
      </DocsReadableWidth>

      <div className="w-full min-w-0 max-w-full overflow-x-clip px-0">
        <Suspense fallback={<LiveVehiclesFallback />}>
          <LiveVehiclesSection />
        </Suspense>
      </div>
    </div>
  );
}
