import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FontPreferenceSwitch } from "@/components/docs/demos/adobe-fonts-switch";
import { MinimumSizeDemo } from "@/components/docs/demos/typography-explainer";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { RelationshipBadges } from "@/components/docs/relationship-badges";
import { SyntaxHighlightedCode } from "@/components/docs/syntax-highlighted-code";
import { getDocsEntry, getUsedBySlugs } from "@/lib/docs-catalog";
import { TFL_BRAND_LINKS } from "@/lib/tfl/brand";

export const metadata: Metadata = {
  title: "Typography",
  description:
    "TfL uses licensed Johnston; compare Hammersmith One and P22 Underground for web interfaces.",
};

const HAMMERSMITH_NEXT_SNIPPET = `import { Hammersmith_One } from "next/font/google";

const hammersmith = Hammersmith_One({
  subsets: ["latin"],
  weight: "400",
});

<html lang="en" className={hammersmith.className}>`;

const HAMMERSMITH_METRICS_SNIPPET = `.app {
  font-family: "Hammersmith One", sans-serif;
  --tfl-title-weight: 400;
  --tfl-title-tracking: 0;
}`;

const ADOBE_FONTS_SNIPPET = `<head>
  <link
    rel="stylesheet"
    href="https://use.typekit.net/YOUR_KIT_ID.css"
  />
</head>`;

const P22_METRICS_SNIPPET = `.app {
  font-family: "p22-underground", sans-serif;
  --tfl-title-weight: 600;
  --tfl-title-tracking: -0.025em;
}`;

const ExternalTextLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <a
    href={href}
    className="text-foreground underline underline-offset-4"
    target="_blank"
    rel="noopener noreferrer"
  >
    {children}
  </a>
);

export default function FoundationsTypographyPage() {
  const entry = getDocsEntry("typography");
  if (!entry) notFound();

  return (
    <DocsReadableWidth>
      <article className="space-y-14">
        <DocsPageHeader entry={entry} />
        <RelationshipBadges usedBy={getUsedBySlugs(entry.slug)} />

        <section className="space-y-8">
          <div className="space-y-2">
            <h2 id="profiles" className="text-lg font-semibold">
              Choose a font profile
            </h2>
            <p className="max-w-prose text-muted-foreground">
              The official TfL typeface is Johnston, which requires permission
              to use. This site compares two practical alternatives so you can
              see how each one changes the same interface.
            </p>
          </div>

          <FontPreferenceSwitch />
        </section>

        <section id="installation" className="space-y-10">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              Add a font to your app
            </h2>
            <p className="max-w-prose text-muted-foreground">
              tfl-components does not bundle or load a font. Components inherit
              their font family from the parent, so your app owns the choice,
              the loading method and the licence.
            </p>
          </div>

          <div className="space-y-14">
            <article className="space-y-5">
              <div className="space-y-1">
                <h3 className="text-xl font-medium text-foreground">
                  Hammersmith One
                </h3>
                <p className="max-w-prose text-muted-foreground">
                  Use it when you need a free default. Next.js can self-host it
                  from Google Fonts. Do not synthesize a heavier title weight or
                  tighten sentence-case titles.
                </p>
              </div>

              <SyntaxHighlightedCode
                code={HAMMERSMITH_NEXT_SNIPPET}
                language="tsx"
                wrapperClassName="mt-0 mb-0"
              />

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">
                  Title settings for Hammersmith One
                </h4>
                <p className="max-w-prose text-sm text-muted-foreground">
                  Keep the component defaults at 400 and normal tracking.
                </p>
                <SyntaxHighlightedCode
                  code={HAMMERSMITH_METRICS_SNIPPET}
                  language="css"
                  wrapperClassName="mt-0 mb-0"
                />
              </div>

              <p className="text-sm text-muted-foreground">
                <ExternalTextLink href="https://nextjs.org/docs/app/getting-started/fonts#google-fonts">
                  Read the Next.js font guide
                </ExternalTextLink>{" "}
                or open{" "}
                <ExternalTextLink href={TFL_BRAND_LINKS.hammersmithOne}>
                  Hammersmith One on Google Fonts
                </ExternalTextLink>
                .
              </p>
            </article>

            <article className="space-y-5">
              <div className="space-y-1">
                <h3 className="text-xl font-medium text-foreground">
                  P22 Underground
                </h3>
                <p className="max-w-prose text-muted-foreground">
                  Use it when you already have an Adobe Fonts subscription and
                  want a closer match to Johnston. This repo uses 400 for body
                  text and 600 for titles.
                </p>
              </div>

              <SyntaxHighlightedCode
                code={ADOBE_FONTS_SNIPPET}
                language="tsx"
                wrapperClassName="mt-0 mb-0"
              />

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">
                  Title settings for P22 Underground
                </h4>
                <p className="max-w-prose text-sm text-muted-foreground">
                  Confirm that the kit has loaded before opting into 600 and
                  tighter tracking. A fallback font with these metrics will look
                  wrong.
                </p>
                <SyntaxHighlightedCode
                  code={P22_METRICS_SNIPPET}
                  language="css"
                  wrapperClassName="mt-0 mb-0"
                />
              </div>

              <p className="text-sm text-muted-foreground">
                <ExternalTextLink href={TFL_BRAND_LINKS.p22UndergroundAdobe}>
                  Open P22 Underground on Adobe Fonts
                </ExternalTextLink>{" "}
                and follow the web project instructions for your account.
              </p>
            </article>

            <article className="space-y-2">
              <h3 className="text-xl font-medium text-foreground">
                Official Johnston
              </h3>
              <p className="max-w-prose text-muted-foreground">
                Do not copy a font file from TfL or another site. For qualifying
                work, apply through{" "}
                <ExternalTextLink href={TFL_BRAND_LINKS.fontRequests}>
                  TfL font requests
                </ExternalTextLink>
                .
              </p>
            </article>
          </div>
        </section>

        <section id="minimum-size" className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              Fit before shrinking
            </h2>
            <p className="max-w-prose text-muted-foreground">
              Long station names should wrap or abbreviate before they become
              hard to read. Scaling stops at{" "}
              <code className="text-xs">STATION_LABEL_MIN_SCALE = 0.75</code>,
              which takes a 16px label down to about 12px. Drag the demo until
              the two strategies split.
            </p>
          </div>

          <MinimumSizeDemo />

          <p className="max-w-prose text-sm text-muted-foreground">
            The{" "}
            <Link
              href="/docs/station-name-labels"
              className="text-foreground underline underline-offset-4"
            >
              Station labels
            </Link>{" "}
            component applies this policy while preserving find, copy and
            accessible names. Test real names and widths in the{" "}
            <Link
              href="/tools/typography"
              className="text-foreground underline underline-offset-4"
            >
              Station typography tool
            </Link>
            .
          </p>
        </section>

        <section className="space-y-2 border-t border-border pt-8">
          <h2 id="licensing" className="text-lg font-semibold">
            Licensing still belongs to the host app
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Installing these components grants no right to use Johnston, TfL Go
            or any other protected typeface. See{" "}
            <Link
              href="/docs/tfl-licensing"
              className="text-foreground underline underline-offset-4"
            >
              Licensing and brand use
            </Link>{" "}
            for the wider rules around type, colours and protected marks.
          </p>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
