import type { Metadata } from "next";
import Link from "next/link";
import { TfLRoundel } from "@/components/tfl/tfl-roundel";
import {
  getRoundelExclusion,
  ROUNDEL_DO_NOT,
  ROUNDEL_FONT_POLICY,
  ROUNDEL_MIN_WIDTH_MM,
  ROUNDEL_MIN_WIDTH_PX,
  TFL_MODAL_COLOURS,
  UNDERGROUND_LINE_COLOURS,
} from "@/lib/tfl/brand";
import {
  ROUNDEL_LOGO_PATHS,
  ROUNDEL_LOGO_SOURCES,
  ROUNDEL_PRESETS,
  TFL_BRAND_LINKS,
  getRoundelLogoPath,
  type RoundelPreset,
} from "@/lib/tfl/roundel-presets";

export const metadata: Metadata = {
  title: "TfL Roundel — tfl-components",
  description:
    "Env-gated TfL roundel with branding tools, modal colours, and font guidance.",
};

const PRESET_KEYS = Object.keys(ROUNDEL_PRESETS) as RoundelPreset[];
const ARTWORK_KEYS = PRESET_KEYS.filter((key) => getRoundelLogoPath(key));
const EXCLUSION_DEMO = getRoundelExclusion(96);

export default function RoundelPage() {
  const allowed =
    process.env.NEXT_PUBLIC_ALLOW_TFL_ROUNDEL === "true" ||
    process.env.VITE_ALLOW_TFL_ROUNDEL === "true" ||
    process.env.ALLOW_TFL_ROUNDEL === "true";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">TfL Roundel</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Env-gated mark with a safe placeholder by default. Brand tooling below
          encodes Basic Elements colours, exclusion zone, and font policy — it
          does not grant a licence.
        </p>
      </div>

      <section className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <div>
          <h2 className="text-lg font-semibold text-destructive">
            Branding warning — read before enabling
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The circle-and-bar roundel is a registered TfL trademark. Changing
            the bar text or colours does{" "}
            <strong className="text-foreground">not</strong> remove that
            protection. This package only delivers code; it does not grant a
            licence.
          </p>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground">Basic Elements do-nots</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {ROUNDEL_DO_NOT.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-foreground">Official TfL links</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                <a
                  href={TFL_BRAND_LINKS.usingBrandIp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-3 hover:text-primary"
                >
                  Using TfL brand IP
                </a>
              </li>
              <li>
                <a
                  href={TFL_BRAND_LINKS.logoRequests}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-3 hover:text-primary"
                >
                  Logo requests
                </a>
              </li>
              <li>
                <a
                  href={TFL_BRAND_LINKS.designStandards}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-3 hover:text-primary"
                >
                  Design standards
                </a>
              </li>
              <li>
                <a
                  href={TFL_BRAND_LINKS.basicElementsPdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-3 hover:text-primary"
                >
                  Basic Elements standards (PDF)
                </a>
              </li>
              <li>
                <a
                  href={TFL_BRAND_LINKS.ipGuidancePdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-3 hover:text-primary"
                >
                  Third-party IP guidance (PDF)
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold">Typography — do not pirate Johnston</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {ROUNDEL_FONT_POLICY.preferred} {ROUNDEL_FONT_POLICY.johnston}
          </p>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Need the real Johnston family? Apply through TfL — never download
            redistributed copies:
          </p>
          <p>
            <a
              href={TFL_BRAND_LINKS.fontRequests}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline underline-offset-3 hover:text-primary"
            >
              Font requests (tfl.gov.uk)
            </a>
          </p>
          <p>Or use these stand-ins:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <a
                href={TFL_BRAND_LINKS.hammersmithOne}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-3 hover:text-primary"
              >
                Hammersmith One
              </a>{" "}
              (Google Fonts) — used as this repo&apos;s UI / roundel bar font
            </li>
            <li>
              <a
                href={TFL_BRAND_LINKS.p22UndergroundAdobe}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-3 hover:text-primary"
              >
                P22 Underground
              </a>{" "}
              (Adobe Fonts) — closer commercial match
            </li>
          </ul>
          <p className="rounded-md bg-muted p-3 font-sans text-base text-foreground">
            The quick brown fox jumps over the lazy dog — Hammersmith One
          </p>
        </div>
      </section>

      <section className="flex flex-wrap items-end gap-8 rounded-lg border border-border bg-card p-6">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Current render
          </p>
          <TfLRoundel className="size-24" />
          <p className="text-sm">
            Mode:{" "}
            <code className="rounded bg-muted px-1 text-xs">
              {allowed ? "official (flag on)" : "placeholder (flag off)"}
            </code>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Sizes (Lucide-style)
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <TfLRoundel className="size-4" />
            <TfLRoundel className="size-5" />
            <TfLRoundel className="size-6" />
            <TfLRoundel className="size-8" />
            <TfLRoundel className="size-10" />
            <TfLRoundel className="size-12" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Exclusion zone (0.25× bar)
          </p>
          <div
            className="inline-flex rounded-md border border-dashed border-muted-foreground/40 bg-muted/40"
            style={EXCLUSION_DEMO.paddingStyle}
          >
            <TfLRoundel className="size-24" variant="underground" />
          </div>
          <p className="max-w-xs text-xs text-muted-foreground">
            For a 96px-wide bar: {EXCLUSION_DEMO.exclusion}px clear space each
            side. Named roundels should stay ≥{ROUNDEL_MIN_WIDTH_MM}mm (~
            {ROUNDEL_MIN_WIDTH_PX}px).
          </p>
          <pre className="overflow-x-auto rounded bg-muted p-2 text-[10px] text-foreground">
            {`import { getRoundelExclusion } from "@/lib/tfl/brand";
const zone = getRoundelExclusion(96); // paddingStyle / paddingClass`}
          </pre>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold">Customise</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set <code className="rounded bg-muted px-1 text-xs">text</code>,{" "}
            <code className="rounded bg-muted px-1 text-xs">ringColor</code>, and{" "}
            <code className="rounded bg-muted px-1 text-xs">barColor</code>.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-6">
          <div className="space-y-2">
            <TfLRoundel
              className="size-20"
              text="MY APP"
              ringColor="#E32017"
              barColor="#0019A8"
            />
            <p className="text-xs text-muted-foreground">Custom text</p>
          </div>
          <div className="space-y-2">
            <TfLRoundel
              className="size-20"
              text="STATUS"
              ringColor="#0098D4"
              barColor="#000000"
            />
            <p className="text-xs text-muted-foreground">Short label</p>
          </div>
          <div className="space-y-2">
            <TfLRoundel className="size-20" text="" lineColor="#6950A1" />
            <p className="text-xs text-muted-foreground">No text / mono</p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold">Mode presets (Basic Elements §3)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Includes outline (Cable Car) and Cycles styles. Pass{" "}
            <code className="rounded bg-muted px-1 text-xs">artwork</code> when a
            local Commons SVG exists.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRESET_KEYS.map((key) => (
            <div
              key={key}
              className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
            >
              <TfLRoundel variant={key} className="size-12" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {ROUNDEL_PRESETS[key].label}
                </p>
                <code className="text-[10px] text-muted-foreground">
                  variant=&quot;{key}&quot; · {ROUNDEL_PRESETS[key].style}
                </code>
              </div>
            </div>
          ))}
        </div>
        {allowed && ARTWORK_KEYS.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Exact Wikimedia artwork
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {ARTWORK_KEYS.map((key) => (
                <TfLRoundel
                  key={`art-${key}`}
                  variant={key}
                  artwork
                  className="h-10 w-auto"
                />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold">Modal colours (§7)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Identity-strip colours from Basic Elements. Import{" "}
            <code className="rounded bg-muted px-1 text-xs">
              TFL_MODAL_COLOURS
            </code>{" "}
            from{" "}
            <code className="rounded bg-muted px-1 text-xs">@/lib/tfl/brand</code>
            .
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(TFL_MODAL_COLOURS).map(([key, swatch]) => (
            <div
              key={key}
              className="overflow-hidden rounded-md border border-border"
            >
              <div
                className="flex h-10 items-center px-2 text-xs font-medium"
                style={{
                  backgroundColor: swatch.hex,
                  color: swatch.stripText === "white" ? "#fff" : swatch.stripText,
                }}
              >
                {swatch.label}
              </div>
              <div className="space-y-0.5 px-2 py-1.5 text-[10px] text-muted-foreground">
                <p className="font-mono text-foreground">{swatch.hex}</p>
                <p>{swatch.pantone}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold">Underground line colours (§7.1)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Prefer{" "}
            <code className="rounded bg-muted px-1 text-xs">tfl-ts</code> helpers
            in product UI; these tokens are for demos and brand checks.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(UNDERGROUND_LINE_COLOURS).map(([key, line]) => (
            <span
              key={key}
              className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs"
            >
              <span
                className="size-3 rounded-sm"
                style={{ backgroundColor: line.hex }}
                aria-hidden
              />
              {line.label}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Import brand tooling</p>
        <pre className="overflow-x-auto rounded bg-muted p-3 text-xs text-foreground">
          {`import {
  TFL_MODAL_COLOURS,
  UNDERGROUND_LINE_COLOURS,
  ROUNDEL_PRESETS,
  getRoundelExclusion,
  ROUNDEL_DO_NOT,
  ROUNDEL_FONT_POLICY,
} from "@/lib/tfl/brand";

// Local SVG: ${ROUNDEL_LOGO_PATHS.underground}
// Commons: ${ROUNDEL_LOGO_SOURCES.underground}`}
        </pre>
      </section>

      <aside className="space-y-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Enable the official mark</p>
        <pre className="overflow-x-auto rounded bg-muted p-3 text-xs text-foreground">
          {`# .env.local (Next.js)
NEXT_PUBLIC_ALLOW_TFL_ROUNDEL=true`}
        </pre>
        <p>
          Setting the flag means <em>your</em> app accepts trademark
          responsibility. Prefer reading{" "}
          <Link
            href={TFL_BRAND_LINKS.usingBrandIp}
            className="text-foreground underline underline-offset-3"
            target="_blank"
            rel="noopener noreferrer"
          >
            TfL&apos;s brand IP page
          </Link>{" "}
          first.
        </p>
        <pre className="overflow-x-auto rounded bg-muted p-3 text-xs text-foreground">
          {`pnpm dlx shadcn@latest add https://tfl-components.vercel.app/r/tfl-roundel.json`}
        </pre>
      </aside>
    </div>
  );
}
