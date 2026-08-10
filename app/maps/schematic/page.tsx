import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { Badge } from "@/components/ui/badge";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Schematic & network maps",
  description:
    "Topology and transport relationships — line and branch strip primitives.",
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
          <Badge variant="secondary">Primitives are primary</Badge>
        </div>

        <section className="space-y-2" aria-labelledby="purpose-heading">
          <h2 id="purpose-heading" className="text-lg font-semibold">
            Purpose
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Topology, branches, and TfL-style schematic diagrams — not literal
            geography. Implementation lives primarily under{" "}
            <strong className="font-medium text-foreground">Primitives</strong>;
            this Maps section is the discovery home for schematic vs geographic
            distinction.
          </p>
        </section>

        <section className="space-y-3" aria-labelledby="primitives-heading">
          <h2 id="primitives-heading" className="text-lg font-semibold">
            Rendering primitives
          </h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href="/primitives/line-strip"
                className="text-primary underline-offset-4 hover:underline"
              >
                Line strip
              </Link>
              <span className="text-muted-foreground">
                {" "}
                — molecular strip (straight or branched) with TfL label recipes
              </span>
            </li>
            <li>
              <Link
                href="/primitives/branch-strip"
                className="text-primary underline-offset-4 hover:underline"
              >
                Branch strip
              </Link>
              <span className="text-muted-foreground">
                {" "}
                — atomic branched lane×pos schematic
              </span>
            </li>
          </ul>
        </section>

        <section className="space-y-2" aria-labelledby="blocks-heading">
          <h2 id="blocks-heading" className="text-lg font-semibold">
            See it composed
          </h2>
          <p className="text-sm text-muted-foreground">
            <Link
              href="/blocks/week-ahead"
              className="text-primary underline-offset-4 hover:underline"
            >
              Week ahead block
            </Link>{" "}
            combines status interpretation with schematic strips.
          </p>
        </section>

        <p className="text-sm text-muted-foreground">
          For real coordinates and OSM geometry, see{" "}
          <Link
            href="/maps/geographic"
            className="text-primary underline-offset-4 hover:underline"
          >
            Geographic maps
          </Link>
          .
        </p>
      </article>
    </DocsReadableWidth>
  );
}
