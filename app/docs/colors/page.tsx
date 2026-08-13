import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ColoursInstallTabs } from "@/components/docs/colours-install-tabs";
import ColoursDemo from "@/components/docs/demos/colours-demo";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { RelationshipBadges } from "@/components/docs/relationship-badges";
import { SyntaxHighlightedCode } from "@/components/docs/syntax-highlighted-code";
import { getDocsEntry, getUsedBySlugs } from "@/lib/docs-catalog";
import { REGISTRY_BASE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Colours",
  description:
    "Official TfL line and mode colours — install tokens, map line ids, copy HEX or OKLCH.",
};

const DATA_LINE_SNIPPET = `<span
  data-line="northern"
  className="bg-[var(--line-color)] text-[var(--line-ink)]"
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

const TFL_COLOURS_CSS = readFileSync(
  join(process.cwd(), "app/tfl-colours.css"),
  "utf8",
);

export default function FoundationsColoursPage() {
  const entry = getDocsEntry("colours");
  if (!entry) notFound();

  return (
    <DocsReadableWidth>
      <article className="space-y-14">
        <DocsPageHeader entry={entry} />
        <RelationshipBadges usedBy={getUsedBySlugs(entry.slug)} />

        <section className="space-y-3">
          <h2 id="purpose" className="text-lg font-semibold">
            Purpose
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Official line and mode colours for identity UI and diagrams. Use
            this page to install the token layers, understand line → colour
            mapping, and copy individual values for design or code.{" "}
            <Link
              href="/docs/line-badge"
              className="text-foreground underline underline-offset-4"
            >
              Line Badge
            </Link>{" "}
            is a separate chip/bar primitive that consumes these tokens.
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="licensing" className="text-lg font-semibold">
            Licensing
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Official line colours are fine for accurate line identity. That is
            not a licence for Johnston or the TfL roundel. See{" "}
            <Link
              href="/docs/tfl-roundel"
              className="text-foreground underline underline-offset-4"
            >
              Roundel
            </Link>{" "}
            and{" "}
            <Link
              href="/docs/tfl-licensing"
              className="text-foreground underline underline-offset-4"
            >
              brand licensing
            </Link>
            . Values follow TfL&apos;s{" "}
            <a
              href="https://tfl.gov.uk/info-for/business-and-advertisers/design-standards"
              className="text-foreground underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              design standards
            </a>{" "}
            (Colour standard Issue 10).
          </p>
        </section>

        <section id="installation" className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Installation</h2>
            <p className="max-w-prose text-muted-foreground">
              Install via the shadcn registry, or copy the CSS variable layers
              into <code className="text-xs">globals.css</code>. Boards and{" "}
              <Link
                href="/docs/line-badge"
                className="text-foreground underline underline-offset-4"
              >
                Line Badge
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

        <section id="mapping" className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Line → colour mapping</h2>
            <p className="max-w-prose text-muted-foreground">
              Three tiers: palette vars (
              <code className="text-xs">--tfl-line-central</code>),{" "}
              <code className="text-xs">data-line</code> binding, then role vars
              (<code className="text-xs">--line-color</code> /{" "}
              <code className="text-xs">--line-ink</code>). Prefer{" "}
              <code className="text-xs">data-line</code> when the id is dynamic.
            </p>
          </div>
          <SyntaxHighlightedCode
            code={DATA_LINE_SNIPPET}
            language="tsx"
            wrapperClassName="mt-0 mb-0"
          />
          <div className="space-y-2">
            <h3 id="tailwind" className="text-base font-medium">
              Tailwind cannot build class names dynamically
            </h3>
            <p className="max-w-prose text-sm text-muted-foreground">
              Utilities such as{" "}
              <code className="text-xs">bg-tfl-line-northern</code> are
              predefined in <code className="text-xs">tfl-colours.css</code>.
              Template strings like{" "}
              <code className="text-xs">{"`bg-tfl-line-${id}`"}</code> are
              invisible to the scanner and will not emit CSS. Import{" "}
              <code className="text-xs">LINE_COLOUR_TOKENS</code> or{" "}
              <code className="text-xs">getLineColourBgClass</code> and use the
              complete string from the map.
            </p>
          </div>
          <SyntaxHighlightedCode
            code={MAP_LOOKUP_SNIPPET}
            language="tsx"
            wrapperClassName="mt-0 mb-0"
          />
        </section>

        <section id="preview" className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Preview</h2>
            <p className="max-w-prose text-sm text-muted-foreground">
              Choose HEX or OKLCH, then tap a value to copy. Print (CMYK ·
              Pantone · NCS) is always shown. Dark values use the Go night
              method (Northern <code className="text-xs">#FCFCFC</code>).
            </p>
          </div>
          <ColoursDemo />
        </section>

        <section id="adaptive" className="space-y-3">
          <h2 className="text-lg font-semibold">Adaptive modes</h2>
          <ul className="max-w-prose list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              <code className="text-xs">.dark</code> — brand + Go night OKLCH;
              Northern becomes light fill / black ink
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
              app opt-in colourless mode (greys today)
            </li>
          </ul>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
