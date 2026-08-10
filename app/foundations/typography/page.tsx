import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { RelationshipBadges } from "@/components/docs/relationship-badges";
import { getDocsEntry, getUsedBySlugs } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Typography",
  description:
    "Safe defaults for type — licensed Johnston / TfL Go vs open alternatives.",
};

export default function FoundationsTypographyPage() {
  const entry = getDocsEntry("typography");
  if (!entry) notFound();

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry} />
        <RelationshipBadges usedBy={getUsedBySlugs(entry.slug)} />

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Purpose</h2>
          <p className="max-w-prose text-muted-foreground">
            Guidance for station names, diagram labels, and board headings.
            Installing a component does <strong className="font-medium text-foreground">not</strong>{" "}
            grant a licence to use Johnston or other protected TfL typefaces.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Safe default</h2>
          <p className="max-w-prose text-muted-foreground">
            This site demos with <strong className="font-medium text-foreground">Hammersmith One</strong>{" "}
            (open Google Font) as a Johnston-like stand-in via{" "}
            <code className="text-xs">next/font</code>. Prefer your product typeface
            in production apps, or request official fonts through TfL’s font
            licensing process.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Station labels</h2>
          <p className="max-w-prose text-muted-foreground">
            How names shrink, abbreviate, and stay copyable is covered in{" "}
            <Link
              href="/foundations/station-labels"
              className="text-primary underline-offset-4 hover:underline"
            >
              Station labels
            </Link>
            . The reusable renderer is{" "}
            <Link
              href="/primitives/station-name"
              className="text-primary underline-offset-4 hover:underline"
            >
              Station name
            </Link>
            ; tune it in the{" "}
            <Link
              href="/tools/typography"
              className="text-primary underline-offset-4 hover:underline"
            >
              Station typography
            </Link>{" "}
            tool.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Licensing</h2>
          <p className="max-w-prose text-muted-foreground">
            See{" "}
            <Link
              href="/foundations/licensing"
              className="text-primary underline-offset-4 hover:underline"
            >
              Licensing & brand use
            </Link>{" "}
            for the full distinction between line colours, protected marks, and
            licensed typefaces.
          </p>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
