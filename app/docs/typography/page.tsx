import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChipTextDemo,
  MinimumSizeDemo,
  TrackingRuleDemo,
} from "@/components/docs/demos/typography-explainer";
import { FontPreferenceSwitch } from "@/components/docs/demos/adobe-fonts-switch";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { RelationshipBadges } from "@/components/docs/relationship-badges";
import { getDocsEntry, getUsedBySlugs } from "@/lib/docs-catalog";
import { TFL_BRAND_LINKS } from "@/lib/tfl/brand";

export const metadata: Metadata = {
  title: "Typography",
  description:
    "Font profiles and legible defaults for open and licensed TfL interfaces.",
};

export default function FoundationsTypographyPage() {
  const entry = getDocsEntry("typography");
  if (!entry) notFound();

  return (
    <DocsReadableWidth>
      <article className="space-y-10">
        <DocsPageHeader entry={entry} />
        <RelationshipBadges usedBy={getUsedBySlugs(entry.slug)} />

        <section className="space-y-2">
          <h2 id="purpose" className="text-lg font-semibold">
            Purpose
          </h2>
          <p className="max-w-prose text-muted-foreground">
            TfL typography guidance assumes a typeface with Johnston’s weights
            and spacing. Most people installing these components will not have
            that font, so the default must also work with an open alternative.
            This foundation separates those two cases instead of forcing one
            set of metrics onto every font.
          </p>
        </section>

        <section className="space-y-4">
          <h2 id="profiles" className="text-lg font-semibold">
            Profiles used by this site
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Neither face below is Johnston.{" "}
            <strong className="font-medium text-foreground">
              Hammersmith One
            </strong>{" "}
            is free and safe to ship; it only has weight 400, so titles stay
            regular with normal tracking.{" "}
            <strong className="font-medium text-foreground">
              P22 Underground
            </strong>{" "}
            is a closer commercial match and can use a real 600 weight with
            tighter title tracking. Compare them side by side.
          </p>
          <FontPreferenceSwitch />
          <p className="max-w-prose text-muted-foreground">
            Johnston is TfL’s licensed typeface. Shipping an unlicensed copy,
            or a scraped file that pretends to be it, is infringement. For a
            legal closer look, licence{" "}
            <a
              href={TFL_BRAND_LINKS.p22UndergroundAdobe}
              className="text-foreground underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              P22 Underground via Adobe Fonts
            </a>
            , or another commercial Johnston-like face you actually own. To use
            Johnston itself on qualifying work, apply through{" "}
            <a
              href={TFL_BRAND_LINKS.fontRequests}
              className="text-foreground underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              TfL font requests
            </a>
            .
          </p>
        </section>

        <section id="component-contract" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Component contract
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Installable components neither load a font nor inspect the
            browser. They inherit the host’s font family and read two optional
            variables for prominent titles.
          </p>
          <p className="max-w-prose text-muted-foreground">
            Without overrides,{" "}
            <code className="text-xs">--tfl-title-weight</code> falls back to
            400 and <code className="text-xs">--tfl-title-tracking</code> to
            normal spacing. A host using licensed Johnston or a tested
            compatible face can set them to 600 and{" "}
            <code className="text-xs">-0.025em</code>. P22 is compatible with
            those metrics, but it is not the official TfL typeface.
          </p>
          <dl className="grid gap-x-6 gap-y-4 border-t border-border pt-4 sm:grid-cols-[10rem_1fr]">
            <dt className="text-sm font-medium text-foreground">Title</dt>
            <dd>
              <p className="tfl-title text-2xl text-foreground">
                Victoria line
              </p>
              <code className="text-[11px] text-muted-foreground">
                tfl-title text-2xl
              </code>
            </dd>
            <dt className="text-sm font-medium text-foreground">Body</dt>
            <dd>
              <p className="text-base font-normal text-foreground">
                Minor delays while we fix a signal fault.
              </p>
              <code className="text-[11px] text-muted-foreground">
                text-base font-normal
              </code>
            </dd>
            <dt className="text-sm font-medium text-foreground">
              Secondary / metadata
            </dt>
            <dd>
              <p className="text-sm text-muted-foreground">
                Updated 2 minutes ago
              </p>
              <code className="text-[11px] text-muted-foreground">
                text-sm text-muted-foreground
              </code>
            </dd>
          </dl>
        </section>

        <section id="tracking" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Tracking follows the font
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Tight title tracking is not a universal TfL effect. It works with
            Johnston-compatible proportions and a real display weight; on
            Hammersmith One plus synthetic bold it crowds sentence-case text.
            Body copy stays at normal tracking in both profiles.
          </p>
          <p className="max-w-prose text-muted-foreground">
            Uppercase operational labels are a separate case. Their uniform
            cap height tolerates deliberate spacing changes better than
            lowercase text, but the value should still be tested in the
            chosen font. Do not apply a title token to ordinary copy.
          </p>
          <TrackingRuleDemo />
        </section>

        <section id="chips" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Text inside chips
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Platform and route chips keep the casing supplied by their data.
            They use cap-height trimming to centre the visible glyphs, rather
            than forcing uppercase or adding uneven padding. This remains
            stable when the host changes font.
          </p>
          <ChipTextDemo />
        </section>

        <section id="minimum-size" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Fit before shrinking
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Station names may wrap, abbreviate, or scale, but scaling stops at{" "}
            <code className="text-xs">STATION_LABEL_MIN_SCALE = 0.75</code>.
            A nominal 16px label therefore bottoms out near 12px. Below that,
            abbreviate or change the layout instead of making the text harder
            to read.
          </p>
          <MinimumSizeDemo />
          <p className="max-w-prose text-sm text-muted-foreground">
            The{" "}
            <Link
              href="/docs/station-name-labels"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Station labels
            </Link>{" "}
            component applies this policy while preserving find, copy, and
            accessible names. Use the{" "}
            <Link
              href="/tools/typography"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Station typography
            </Link>{" "}
            tool to test real names at different widths.
          </p>
        </section>

        <section className="space-y-2 border-t border-border pt-8">
          <h2 id="licensing" className="text-lg font-semibold">
            Licensing
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Installing these components grants no right to use Johnston, TfL
            Go, or other protected typefaces. Ship{" "}
            <a
              href={TFL_BRAND_LINKS.hammersmithOne}
              className="text-foreground underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Hammersmith One
            </a>
            , your own product font, or a licensed commercial stand-in such as{" "}
            <a
              href={TFL_BRAND_LINKS.p22UndergroundAdobe}
              className="text-foreground underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              P22 Underground
            </a>
            . For Johnston on qualifying work, use{" "}
            <a
              href={TFL_BRAND_LINKS.fontRequests}
              className="text-foreground underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              TfL font requests
            </a>
            . See{" "}
            <Link
              href="/docs/tfl-licensing"
              className="text-primary underline-offset-4 hover:underline"
            >
              Licensing & brand use
            </Link>{" "}
            for type, colours, and protected marks.
          </p>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
