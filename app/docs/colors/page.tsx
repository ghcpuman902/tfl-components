import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ColoursInstallTabs } from "@/components/docs/colours-install-tabs";
import ColoursDemo from "@/components/docs/demos/colours-demo";
import { BwLineStylesCompare } from "@/components/docs/demos/bw-line-styles-compare";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { RelationshipBadges } from "@/components/docs/relationship-badges";
import { SyntaxHighlightedCode } from "@/components/docs/syntax-highlighted-code";
import { getDocsEntry, getUsedBySlugs } from "@/lib/docs-catalog";
import { REGISTRY_BASE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Colours",
  description:
    "Official TfL line and mode colours. Arrivals boards and status already apply them.",
};

const DATA_LINE_SNIPPET = `// data-line resolves --line-color / --line-ink for you
<span
  data-line="northern"
  className="inline-flex items-center bg-[var(--line-color)] px-2 py-0.5 text-xs font-bold text-[var(--line-ink)]"
>
  Northern
</span>

// vars are just CSS — override when you need a one-off
<span
  data-line="northern"
  className="inline-flex items-center bg-[var(--line-color)] px-2 py-0.5 text-xs font-bold text-[var(--line-ink)]"
  style={{ "--line-color": "#6D2077", "--line-ink": "#fff" }}
>
  Northern
</span>`;

const MAP_LOOKUP_SNIPPET = `import {
  getLineColourBgClass,
  getLineColourToken,
  LINE_COLOUR_TOKENS,
} from "@/lib/tfl/line-colour-map"

// Iterate published tokens
for (const token of LINE_COLOUR_TOKENS) {
  console.log(token.id, token.hex, token.bgClass)
}

const line = { id: "northern" }

// ✅ Look up a complete class string
const bg = getLineColourBgClass(line.id) // "bg-tfl-line-northern"

// ❌ Tailwind never sees this — no CSS emitted
// className={\`bg-tfl-line-\${line.id}\`}

// ✅ Or bind dynamically without a utility class
<span data-line={line.id} className="bg-[var(--line-color)]" />`;

const LINE_PRIMITIVE_SNIPPET = `import { LineName } from "@/components/tfl/brand/line-name"
import { LineBadge } from "@/components/tfl/brand/line-badge"

<LineName lineId="victoria" />
<LineBadge lineId="central" />`;

const CHIP_CLASS =
  "inline-flex items-center bg-[var(--line-color)] px-2 py-0.5 text-xs font-bold text-[var(--line-ink)] tabular-nums";

const TFL_COLOURS_CSS = readFileSync(
  join(process.cwd(), "app/tfl-colours.css"),
  "utf8",
);

/** `:root` + `.dark` + `@theme` — the layers install adds to globals. */
const TFL_COLOUR_TOKEN_LAYERS = (() => {
  const start = TFL_COLOURS_CSS.indexOf(":root");
  const pin = TFL_COLOURS_CSS.indexOf("/* Pin utilities");
  if (start < 0) return TFL_COLOURS_CSS;
  return TFL_COLOURS_CSS.slice(start, pin < 0 ? undefined : pin).trim();
})();

export default function FoundationsColoursPage() {
  const entry = getDocsEntry("colours");
  if (!entry) notFound();

  return (
    <DocsReadableWidth>
      <article className="space-y-14">
        <DocsPageHeader entry={entry} />
        <RelationshipBadges usedBy={getUsedBySlugs(entry.slug)} />

        <p className="max-w-prose text-sm text-muted-foreground">
          Values follow TfL&apos;s{" "}
          <a
            href="https://tfl.gov.uk/info-for/business-and-advertisers/design-standards"
            className="text-foreground underline underline-offset-4"
            target="_blank"
            rel="noopener noreferrer"
          >
            design standards
          </a>{" "}
          (Colour standard Issue 10). Not a licence for Johnston or the{" "}
          <Link
            href="/docs/tfl-roundel"
            className="text-foreground underline underline-offset-4"
          >
            roundel
          </Link>
          ; see{" "}
          <Link
            href="/docs/tfl-licensing"
            className="text-foreground underline underline-offset-4"
          >
            Licensing
          </Link>
          .
        </p>

        <section className="space-y-4">
          <ColoursDemo title="All colours — click to copy" titleId="colours" />
          <h3 id="css" className="text-base font-medium">
            CSS variables
          </h3>
          <p className="max-w-prose text-sm text-muted-foreground">
            One name per colour. Light lives in{" "}
            <code className="text-xs">:root</code>, dark in{" "}
            <code className="text-xs">.dark</code>.{" "}
            <code className="text-xs">@theme</code> exposes{" "}
            <code className="text-xs">--color-tfl-*</code> for Tailwind
            utilities.
          </p>
          <SyntaxHighlightedCode
            code={TFL_COLOUR_TOKEN_LAYERS}
            language="css"
            peekLines={10}
            wrapperClassName="mt-0 mb-0"
          />
        </section>

        <section className="space-y-4">
          <h2 id="when" className="text-lg font-semibold">
            When to use these tokens
          </h2>
          <p className="max-w-prose text-muted-foreground">
            <Link
              href="/docs/tube-rail-arrivals"
              className="text-foreground underline underline-offset-4"
            >
              Arrivals boards
            </Link>{" "}
            and{" "}
            <Link
              href="/docs/tube-rail-status"
              className="text-foreground underline underline-offset-4"
            >
              status
            </Link>{" "}
            already paint line colour. For a label or chip, use{" "}
            <Link
              href="/docs/line-title"
              className="text-foreground underline underline-offset-4"
            >
              Line title
            </Link>{" "}
            or{" "}
            <Link
              href="/docs/line-chip"
              className="text-foreground underline underline-offset-4"
            >
              Line chip
            </Link>
            .
          </p>
          <SyntaxHighlightedCode
            code={LINE_PRIMITIVE_SNIPPET}
            language="tsx"
            wrapperClassName="mt-0 mb-0"
          />
          <p className="max-w-prose text-sm text-muted-foreground">
            Copy from this page when:
          </p>
          <ul className="max-w-prose list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>The colour is not a line — TfL blue, coaches</li>
            <li>Values for Figma</li>
            <li>A custom component</li>
          </ul>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <h2 id="installation" className="text-lg font-semibold">
              Installation
            </h2>
            <p className="max-w-prose text-muted-foreground">
              Install via the shadcn registry, or copy the CSS variable layers
              into <code className="text-xs">globals.css</code>. Boards and{" "}
              <Link
                href="/docs/line-chip"
                className="text-foreground underline underline-offset-4"
              >
                Line chip
              </Link>{" "}
              also pull <code className="text-xs">tfl-colours</code>{" "}
              transitively.
            </p>
          </div>
          <ColoursInstallTabs
            registryUrl={`${REGISTRY_BASE}/tfl-colours.json`}
            cssText={TFL_COLOURS_CSS}
          />
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <h2 id="mapping" className="text-lg font-semibold">
              Line → colour mapping
            </h2>
            <p className="max-w-prose text-muted-foreground">
              Three tiers: palette vars (
              <code className="text-xs">--tfl-line-central</code>),{" "}
              <code className="text-xs">data-line</code> binding, then role vars
              (<code className="text-xs">--line-color</code> /{" "}
              <code className="text-xs">--line-ink</code>). Prefer{" "}
              <code className="text-xs">data-line</code> when the id is dynamic.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span data-line="northern" className={CHIP_CLASS}>
              Northern
            </span>
            <span
              data-line="northern"
              className={CHIP_CLASS}
              style={
                {
                  "--line-color": "#6D2077",
                  "--line-ink": "#fff",
                } as CSSProperties
              }
            >
              Northern
            </span>
          </div>

          <SyntaxHighlightedCode
            code={DATA_LINE_SNIPPET}
            language="tsx"
            wrapperClassName="mt-0 mb-0"
          />

          <h3 id="tailwind" className="text-base font-medium">
            Tailwind cannot build class names dynamically
          </h3>
          <SyntaxHighlightedCode
            code={MAP_LOOKUP_SNIPPET}
            language="tsx"
            wrapperClassName="mt-0 mb-0"
          />
        </section>

        <section className="space-y-3">
          <h2 id="adaptive" className="text-lg font-semibold">
            Adaptive modes
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            TfL has not published dark-mode line colours. Dark tokens shift the
            Colour standard values slightly lighter and a little more chromatic,
            hue held.
          </p>
          <ul className="max-w-prose list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              <code className="text-xs">.dark</code> — those derived colours.
              Northern uses a light fill and black ink
            </li>
            <li>
              <code className="text-xs">data-tfl-northern=&quot;halo&quot;</code>{" "}
              — opt-in brand-black Northern with halo helpers when paint sits on
              an uncontrolled background
            </li>
            <li>
              <code className="text-xs">prefers-contrast</code> /{" "}
              <code className="text-xs">forced-colors</code> — role tokens adapt;
              forced colours use a real border
            </li>
            <li>
              <code className="text-xs">data-tfl-colour=&quot;mono&quot;</code> —
              greys <code className="text-xs">--line-color</code> /{" "}
              <code className="text-xs">--line-ink</code> for chrome. Stroke
              motifs live on strips — see{" "}
              <a
                href="#mono"
                className="text-foreground underline underline-offset-4"
              >
                Mono line styles
              </a>
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 id="mono" className="text-lg font-semibold">
            Mono line styles
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Colour route paint vs black-and-white Tube map stroke patterns
            (provisional reconstruction of the{" "}
            <a
              href="https://content.tfl.gov.uk/bw-large-print-tube-map.pdf"
              className="text-foreground underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              large-print B&amp;W map
            </a>{" "}
            key). Palette tokens{" "}
            <code className="text-xs">--tfl-mono-ink</code> /{" "}
            <code className="text-xs">paper</code> /{" "}
            <code className="text-xs">grey</code> /{" "}
            <code className="text-xs">light</code> invert in{" "}
            <code className="text-xs">.dark</code>. Only{" "}
            <a
              href="/docs/line-strip"
              className="text-foreground underline underline-offset-4"
            >
              Simple line strip
            </a>
            ,{" "}
            <a
              href="/docs/branch-strip-horizontal"
              className="text-foreground underline underline-offset-4"
            >
              Branch strip — horizontal
            </a>
            , and{" "}
            <a
              href="/docs/branch-strip-vertical"
              className="text-foreground underline underline-offset-4"
            >
              vertical
            </a>{" "}
            paint the motifs, via a{" "}
            <code className="text-xs">mono</code> prop.
          </p>
          <BwLineStylesCompare />
        </section>
      </article>
    </DocsReadableWidth>
  );
}
