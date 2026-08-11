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
      <article className="space-y-10">
        <DocsPageHeader entry={entry} />
        <RelationshipBadges usedBy={getUsedBySlugs(entry.slug)} />

        <section className="space-y-2">
          <h2 id="purpose" className="scroll-m-20 text-lg font-semibold">
            Purpose
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Transport UI carries a lot of type at small sizes — stop names,
            platform chips, countdowns. What keeps it legible is case,
            tracking, how text sits inside a chip, and when to abbreviate —
            not which specific typeface you use. Installing a component does{" "}
            <strong className="font-medium text-foreground">not</strong>{" "}
            grant a licence to use Johnston or other protected transport
            typefaces.
          </p>
        </section>

        <section className="space-y-2">
          <h2 id="safe-default" className="scroll-m-20 text-lg font-semibold">
            Safe default
          </h2>
          <p className="max-w-prose text-muted-foreground">
            This site demos with{" "}
            <strong className="font-medium text-foreground">
              Hammersmith One
            </strong>{" "}
            (open Google Font) as a geometric-sans stand-in via{" "}
            <code className="text-xs">next/font</code>. Prefer your own
            product typeface, or request an official licensed typeface
            through the relevant operator’s font process.
          </p>
          <div className="space-y-3 border-t border-border pt-4">
            <div>
              <p className="text-2xl leading-tight font-normal text-foreground">
                Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu
                Vv Ww Xx Yy Zz
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Regular · <code className="text-[11px]">font-normal</code>
              </p>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-2xl leading-tight font-semibold text-foreground">
                Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu
                Vv Ww Xx Yy Zz
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Semibold · <code className="text-[11px]">font-semibold</code>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Hammersmith One only ships one weight (400); the browser
              synthesises the row above. Switch to P22 Underground below and
              it stops faking it — 600 is a real DemiBold cut.
            </p>
          </div>
          <div className="space-y-3 border-t border-border pt-4">
            <p className="max-w-prose text-muted-foreground">
              The closest a public typeface gets to TfL’s own Johnston is{" "}
              <strong className="font-medium text-foreground">
                P22 Underground
              </strong>
              , a commercial Adobe Fonts family. It needs an Adobe Fonts
              subscription with this kit added, so it stays opt-in rather
              than bundled: the switch below changes the whole site’s body
              font, but only renders P22 if your own browser has that kit
              loaded.
            </p>
            <FontPreferenceSwitch />
          </div>
        </section>

        <section id="scale" className="scroll-mt-20 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Weight and size
          </h2>
          <p className="max-w-prose text-muted-foreground">
            One scale, used consistently, reads as a system. Mixing ad-hoc
            sizes and weights per component is what makes a UI feel
            unbranded.
          </p>
          <dl className="grid gap-x-6 gap-y-4 border-t border-border pt-4 sm:grid-cols-[10rem_1fr]">
            <dt className="text-sm font-medium text-foreground">Heading</dt>
            <dd>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                Victoria line
              </p>
              <code className="text-[11px] text-muted-foreground">
                text-2xl font-bold tracking-tight
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

        <section id="tracking" className="scroll-mt-20 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Tracking: caps vs sentence case
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Adjust letter-spacing on{" "}
            <strong className="font-medium text-foreground">uppercase</strong>{" "}
            labels freely — every glyph is the same cap height, so tightened
            or widened tracking still separates cleanly. Leave{" "}
            <strong className="font-medium text-foreground">
              lowercase / sentence case
            </strong>{" "}
            body text at normal tracking; the same adjustment collides
            ascenders, descenders, and round letterforms.
          </p>
          <TrackingRuleDemo />
        </section>

        <section id="chips" className="scroll-mt-20 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Text inside chips
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Chips (platform numbers, route codes) centre text with a
            cap-height text-box trim instead of padding, so the glyph — not
            the box — sits on the optical centre line. Keep the label’s real
            casing; don’t paint it uppercase on top of the trim.
          </p>
          <ChipTextDemo />
        </section>

        <section id="minimum-size" className="scroll-mt-20 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            How small before you abbreviate
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Shrinking type is a fit strategy, not a floor-less one. This
            library’s scale-down policy stops at{" "}
            <code className="text-xs">STATION_LABEL_MIN_SCALE = 0.75</code> —
            roughly a 16px label bottoming out at 12px. Below that, swap in an
            abbreviation (or a different treatment entirely) rather than
            continuing to shrink text that’s already hard to read.
          </p>
          <MinimumSizeDemo />
          <p className="max-w-prose text-sm text-muted-foreground">
            This is the same policy behind{" "}
            <Link
              href="/docs/station-name-labels"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Station labels
            </Link>
            , where it also handles wrapping, find, copy, and screen readers
            for real station names. Tune it live in the{" "}
            <Link
              href="/tools/typography"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Station typography
            </Link>{" "}
            tool.
          </p>
        </section>

        <section className="space-y-2 border-t border-border pt-8">
          <h2 id="licensing" className="scroll-m-20 text-lg font-semibold">
            Licensing
          </h2>
          <p className="max-w-prose text-muted-foreground">
            See{" "}
            <Link
              href="/docs/tfl-licensing"
              className="text-primary underline-offset-4 hover:underline"
            >
              Licensing & brand use
            </Link>{" "}
            for the full distinction between line colours, protected marks,
            and licensed typefaces.
          </p>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
