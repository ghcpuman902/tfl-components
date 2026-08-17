import type { Metadata } from "next";
import {
  branchStripMetrics,
} from "@/lib/tfl/branch-strip-layout";
import { NORTHERN_LINE_SCHEMATIC_HORIZONTAL } from "@/lib/tfl/fixtures/northern-line-schematic-horizontal";
import { VICTORIA_STRIP } from "@/lib/tfl/fixtures/victoria-line-strip";
import {
  DIAGRAM_BASELINE,
  horizontalDiagramMetrics,
  horizontalStationFontSize,
} from "@/lib/tfl/line-diagram";
import {
  DEFAULT_MIN_NEIGHBOUR_CLEARANCE_EM,
  evaluateNeighbourClearance,
  rankNeighbourPairs,
  type NeighbourClearanceResult,
} from "@/lib/tfl/station-neighbour-clearance";
import { NeighbourClearanceCard } from "./neighbour-clearance-card";

export const metadata: Metadata = {
  title: "Station neighbour clearance (temp)",
  description:
    "Temp research: does an adjacent station's label leave breathing room, using real line data.",
};

const x = DIAGRAM_BASELINE.horizontal;
const straightMetrics = horizontalDiagramMetrics("above");
const STRAIGHT_PITCH_PX = straightMetrics.colWidthUnits * x;
const STRAIGHT_FONT_PX = horizontalStationFontSize(x);

const branchMetrics = branchStripMetrics("horizontal");

/** Same-lane edges only — cross-lane joins already get separate above/below bands. */
const northernSameLanePairs = (() => {
  const byId = new Map(
    NORTHERN_LINE_SCHEMATIC_HORIZONTAL.nodes.map((node) => [node.id, node]),
  );
  return NORTHERN_LINE_SCHEMATIC_HORIZONTAL.edges
    .map((edge) => ({ from: byId.get(edge.from)!, to: byId.get(edge.to)! }))
    .filter((pair) => pair.from.lane === pair.to.lane)
    .map((pair) => ({
      a: pair.from.name,
      b: pair.to.name,
      pitchPx: branchMetrics.mainPitch * Math.abs(pair.from.pos - pair.to.pos),
    }));
})();

const victoriaResults = rankNeighbourPairs(
  VICTORIA_STRIP,
  STRAIGHT_PITCH_PX,
  { fontSizePx: STRAIGHT_FONT_PX },
);

const northernResults: NeighbourClearanceResult[] = northernSameLanePairs
  .map((pair) =>
    evaluateNeighbourClearance(pair.a, pair.b, pair.pitchPx, {
      fontSizePx: branchMetrics.nameFont,
    }),
  )
  .sort((r1, r2) => r1.gapEm - r2.gapEm);

const WORST_N = 4;

/** Re-run the worst offenders with a pre-shrunk box, budget shared with the neighbour. */
const withReservedBudget = (results: NeighbourClearanceResult[]) =>
  results.slice(0, 3).map((r) =>
    evaluateNeighbourClearance(r.a.name, r.b.name, r.pitchPx, {
      fontSizePx: r.fontSizePx,
      allowAbbreviation: true,
      reserveClearance: true,
    }),
  );

const victoriaWorst = victoriaResults.slice(0, WORST_N);
const northernWorst = northernResults.slice(0, WORST_N);
const victoriaBudgeted = withReservedBudget(victoriaResults);
const northernBudgeted = withReservedBudget(northernResults);

const summarise = (results: NeighbourClearanceResult[]) => {
  const failing = results.filter((r) => !r.clears).length;
  return `${failing} of ${results.length} adjacent pairs fall under the ${DEFAULT_MIN_NEIGHBOUR_CLEARANCE_EM}em target`;
};

export default function StationNeighbourClearanceTempPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-10">
      <header className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Temp research — not linked in nav
        </p>
        <h1 className="text-2xl font-semibold">
          Station neighbour clearance
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          <code className="rounded bg-muted px-1 text-xs">StationName</code>{" "}
          only ever checks a station&apos;s own box — it has no idea a
          neighbour exists. Below, real adjacent pairs from the live Victoria
          and Northern demos are measured for how much space would actually
          sit between two independently-wrapped labels, using the same{" "}
          <code className="rounded bg-muted px-1 text-xs">
            formatStationLabel
          </code>{" "}
          the production strips call. Target clearance is{" "}
          {DEFAULT_MIN_NEIGHBOUR_CLEARANCE_EM}em, centred on the shared pitch
          boundary. Numbers use the SSR character-count measure (
          <code className="rounded bg-muted px-1 text-xs">
            approximateStationMeasure
          </code>
          ), so they&apos;re a deterministic estimate, not a canvas
          measurement of the live page.
        </p>
      </header>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">
            Victoria — straight strip, horizontal
          </h2>
          <p className="text-sm text-muted-foreground">
            {summarise(victoriaResults)}. Pitch {STRAIGHT_PITCH_PX}px, font{" "}
            {STRAIGHT_FONT_PX}px (desktop baseline).
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {victoriaWorst.map((result) => (
            <NeighbourClearanceCard key={`${result.a.name}-${result.b.name}`} result={result} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">
            Northern — branch strip, horizontal (same-lane pairs)
          </h2>
          <p className="text-sm text-muted-foreground">
            {summarise(northernResults)}. Cross-lane joins (Mill Hill spur,
            Camden/Euston branch points) sit on different rows and aren&apos;t
            checked here — that overlap risk is already covered by the
            estimated-box overlap test in{" "}
            <code className="rounded bg-muted px-1 text-xs">
              schematic-layout.test.ts
            </code>
            . Vertical branch labels use a different clearance axis (row
            height vs. label height) and aren&apos;t covered by this pass.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {northernWorst.map((result) => (
            <NeighbourClearanceCard key={`${result.a.name}-${result.b.name}`} result={result} />
          ))}
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-8">
        <div>
          <h2 className="text-lg font-semibold">
            Does reserving the clearance budget upfront help?
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Turning on <code className="rounded bg-muted px-1 text-xs">allowAbbreviation</code>{" "}
            alone changes nothing here — the algorithm already reports
            &quot;fits&quot; against the full pitch after a 2-line wrap, so it
            never reaches the abbreviation step. Below, each station&apos;s{" "}
            <em>own</em> box is pre-shrunk by half the target clearance before
            the existing wrap → abbreviate chain runs — no new fallback
            logic, just a smaller box fed into the same function. It helps
            for names with a real abbreviation candidate; it doesn&apos;t
            invent one where none exists.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[...victoriaBudgeted, ...northernBudgeted].map((result) => (
            <NeighbourClearanceCard key={`${result.a.name}-${result.b.name}-budgeted`} result={result} />
          ))}
        </div>
      </section>
    </div>
  );
}
