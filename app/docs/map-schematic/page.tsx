import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { RelationshipBadges } from "@/components/docs/relationship-badges";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Schematic & network maps",
  description:
    "Line diagrams, branches, and journeys. Topology, not geography. A full multi-line network map is not shipped yet.",
};

export default function MapsSchematicPage() {
  const entry = getDocsEntry("maps-schematic");
  if (!entry) notFound();

  return (
    <DocsReadableWidth>
      <article className="space-y-12">
        <DocsPageHeader entry={entry} />
        <RelationshipBadges
          builtWith={[
            "line-strip",
            "branch-strip-horizontal",
            "branch-strip-vertical",
            "station-name-labels",
            "line-chip",
          ]}
          usesFoundations={["colours"]}
        />

        <section className="space-y-4">
          <h2 id="diagram-kinds" className="text-lg font-semibold text-foreground">
            Diagram kinds
          </h2>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="font-medium text-foreground">Line diagram</dt>
              <dd className="text-muted-foreground">
                Ordered stops along one corridor.{" "}
                <Link
                  href="/docs/line-strip"
                  className="text-foreground underline underline-offset-4"
                >
                  Line strip
                </Link>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                Branched route
              </dt>
              <dd className="text-muted-foreground">
                Lanes and joins.{" "}
                <Link
                  href="/docs/branch-strip-horizontal"
                  className="text-foreground underline underline-offset-4"
                >
                  Branch strip — horizontal
                </Link>
                {" · "}
                <Link
                  href="/docs/branch-strip-vertical"
                  className="text-foreground underline underline-offset-4"
                >
                  vertical
                </Link>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Journey</dt>
              <dd className="text-muted-foreground">
                A to B with expandable intermediates.{" "}
                <code className="text-xs">JourneyDiagram</code> in the
                line-strip package.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                Multi-line network
              </dt>
              <dd className="text-muted-foreground">
                Not shipped. Week ahead shows several lines as separate strips,
                not one network canvas.
              </dd>
            </div>
          </dl>
        </section>

        <section className="max-w-prose space-y-2 border-t border-border pt-8">
          <h2 id="in-code" className="text-lg font-semibold text-foreground">
            In code
          </h2>
          <p className="text-sm text-muted-foreground">
            <Link
              href="/docs/map-geographic"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Geographic maps
            </Link>
            {" · "}
            <Link
              href="/blocks/week-ahead"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Week ahead
            </Link>
          </p>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
