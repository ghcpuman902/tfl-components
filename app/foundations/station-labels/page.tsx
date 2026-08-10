import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AccessibilityIcon,
  ClipboardCopyIcon,
  SearchIcon,
  type LucideIcon,
} from "lucide-react";
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

const IDENTITY_CARDS: readonly {
  icon: LucideIcon;
  title: string;
  body: string;
}[] = [
  {
    icon: SearchIcon,
    title: "Find",
    body: "Browser find still matches the full station name when the on-screen label is abbreviated or wrapped.",
  },
  {
    icon: ClipboardCopyIcon,
    title: "Copy",
    body: "Paste gets the complete name. No abbreviations, soft breaks, or leftover line splits.",
  },
  {
    icon: AccessibilityIcon,
    title: "Screen readers",
    body: "Assistive tech always hears the full name in context, never a shortened or cryptic version.",
  },
];

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

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            No-compromise station name display
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Labels can abbreviate or break across two lines when width is tight.
            Find, copy, and screen readers still get the real name.
          </p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {IDENTITY_CARDS.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="relative overflow-hidden rounded-xl border border-border bg-card p-4"
              >
                <Icon
                  className="pointer-events-none absolute -right-4 top-1/2 size-36 -translate-y-1/2 text-foreground opacity-[0.1]"
                  strokeWidth={2.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                />
                <div className="relative space-y-1 pr-10">
                  <h3 className="font-medium text-foreground">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="max-w-prose text-sm text-muted-foreground">
            See{" "}
            <Link
              href="/primitives/station-name"
              className="text-foreground underline-offset-4 hover:underline"
            >
              StationName
            </Link>{" "}
            for implementation details.
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
