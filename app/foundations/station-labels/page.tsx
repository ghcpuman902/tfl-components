import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AbbreviationDemo,
  CopyFindDemo,
  PlatformWidthDemo,
  StationWidthDemo,
} from "@/components/docs/demos/station-labels-explainer";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { RelationshipBadges } from "@/components/docs/relationship-badges";
import { getDocsEntry, getUsedBySlugs } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Station labels",
  description:
    "How station names and platform chips shrink with width while copy, find, and screen readers keep the full name.",
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

        <section className="max-w-prose space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            No-compromise station name display
          </h2>
          <p className="text-muted-foreground">
            Station names are rendered to always remain accessible, understandable, and discoverable,
            even when space is tight. Familiar patterns, such as abbreviations or double-line breaks,
            let names fit into constrained layouts, but never at the cost of usability.
            <br />
            The intent: <br />
            (1) Users should always be able to search station names by their full text in the browser.<br />
            (2) Copying a station name returns the complete, unbroken name—never abbreviations or extra line breaks.<br />
            (3) Screen readers always receive the full name in context, not a shortened or cryptic version.<br />
            See{" "}
            <Link
              href="/primitives/station-name"
              className="text-foreground underline-offset-4 hover:underline"
            >
              StationName
            </Link>
            {" "}for implementation details.
          </p>
        </section>
   

        <section id="width" className="scroll-mt-20 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Every screen size
          </h2>
          <StationWidthDemo />
          <p className="max-w-prose text-sm text-muted-foreground">
            Tune in{" "}
            <Link
              href="/tools/typography"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Station typography
            </Link>
            .
          </p>
        </section>

        <section id="platforms" className="scroll-mt-20 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Platforms</h2>
          <PlatformWidthDemo />
        </section>

        <section id="abbreviations" className="scroll-mt-20 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Abbreviations
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Only when the full name overflows. Resize the board below.
          </p>
          <AbbreviationDemo />
        </section>

        <section id="accessibility" className="scroll-mt-20 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Copy, find, and screen readers
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Layout can wrap or shorten. Identity does not.
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
              href="/primitives/station-name"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Station name
            </Link>
          </p>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
