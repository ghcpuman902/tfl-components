import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AbbreviationDemo,
  CopyFindDemo,
  StationWidthDemo,
} from "@/components/docs/demos/station-labels-explainer";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { RelationshipBadges } from "@/components/docs/relationship-badges";
import { getDocsEntry, getUsedBySlugs } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Station name labels",
  description:
    "How station names shrink with width while copy, find, and screen readers keep the full name.",
};

export default function StationLabelsFoundationPage() {
  const entry = getDocsEntry("station-labels");
  if (!entry) notFound();

  return (
    <DocsReadableWidth>
      <article className="space-y-12">
        <DocsPageHeader entry={entry} />
        <RelationshipBadges
          builtWith={entry.builtWith}
          usedBy={getUsedBySlugs(entry.slug)}
        />

        <section id="width" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Every screen size
          </h2>
          <StationWidthDemo />
        </section>

        <section id="abbreviations" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Abbreviations
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Only when the full name overflows. Resize the board below.
          </p>
          <AbbreviationDemo />
        </section>

        <section id="accessibility" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Copy, find, and screen readers
          </h2>
          <p className="max-w-prose text-muted-foreground">
            The painted label can wrap or abbreviate. Find, copy, and screen
            readers still get the full name, with no leftover line split.
          </p>
          <CopyFindDemo />
        </section>

        <section className="max-w-prose space-y-2 border-t border-border pt-8">
          <h2 className="text-lg font-semibold text-foreground">In code</h2>
          <p className="text-sm text-muted-foreground">
            <code className="text-xs">station-typography</code> ·{" "}
            <code className="text-xs">station-abbreviations</code> ·{" "}
            <code className="text-xs">station-label-find</code> ·{" "}
            <Link
              href="/docs/platform-chip"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Platform chip
            </Link>
          </p>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
