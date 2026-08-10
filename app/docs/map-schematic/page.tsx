import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { RelationshipBadges } from "@/components/docs/relationship-badges";
import { Badge } from "@/components/ui/badge";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Schematic & network maps",
  description:
    "Topology: line diagrams, branches, journeys, and multi-line networks.",
};

export default function MapsSchematicPage() {
  const entry = getDocsEntry("maps-schematic");
  if (!entry) notFound();

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry} />

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Schematic / network</Badge>
          <Badge variant="secondary">Incremental — not a full network map</Badge>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Purpose</h2>
          <p className="max-w-prose text-muted-foreground">
            Topology and transport relationships — not literal geography. This
            page explains the diagram kinds and links to the components that
            implement them today. A complete interactive multi-line network map
            does <strong className="font-medium text-foreground">not</strong>{" "}
            exist yet.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Diagram kinds</h2>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="font-medium text-foreground">Line diagram</dt>
              <dd className="text-muted-foreground">
                Ordered stops along one corridor —{" "}
                <Link
                  href="/docs/line-strip"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Line strip
                </Link>{" "}
                (data-aware) composing{" "}
                <code className="text-xs">StraightStrip</code>.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                Branched route diagram
              </dt>
              <dd className="text-muted-foreground">
                Lane×pos schematics —{" "}
                <Link
                  href="/docs/branch-strip"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Branch strip
                </Link>{" "}
                via <code className="text-xs">LineStrip schematic=…</code>.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Journey diagram</dt>
              <dd className="text-muted-foreground">
                A→B with expandable intermediates (
                <code className="text-xs">JourneyDiagram</code> in the line-strip
                registry package).
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                Multi-line network representation
              </dt>
              <dd className="text-muted-foreground">
                Future work — not shipped as a complete product. Week ahead
                shows multiple lines as separate strips, not a single network
                canvas.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                Geographic route geometry
              </dt>
              <dd className="text-muted-foreground">
                Real coordinates — belongs under{" "}
                <Link
                  href="/docs/map-geographic"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Geographic maps
                </Link>
                , not here.
              </dd>
            </div>
          </dl>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Related components</h2>
          <RelationshipBadges
            builtWith={["line-strip", "branch-strip", "station-name"]}
            usesFoundations={["line-badge"]}
          />
          <p className="text-sm text-muted-foreground">
            Composed example:{" "}
            <Link
              href="/blocks/week-ahead"
              className="text-primary underline-offset-4 hover:underline"
            >
              Week ahead Block
            </Link>
            .
          </p>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
