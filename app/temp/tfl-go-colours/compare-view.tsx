import {
  analyseGoColours,
  applyBrandNightMethod,
  fmtDelta,
  wcagContrast,
  type ContrastRow,
  type TransformFit,
} from "./analysis";
import {
  GO_COLOUR_ROWS,
  GO_DAY_PAPER,
  GO_NIGHT_PAPER,
  type GoColourRow,
} from "./samples";

/** Tube-map stroke height — same across brand / day / night segments. */
const LINE_H = "h-3";

const fmtRatio = (n: number | null | undefined, digits = 2) =>
  n == null ? "—" : n.toFixed(digits);

const fmtLc = (n: number | null | undefined) =>
  n == null ? "—" : n.toFixed(1);

/**
 * WCAG ratio → heatmap colour (red = weak, green = strong).
 * Anchors: ~1.5 fail · 3 UI floor · 4.5 AA · 7 AAA.
 */
const contrastHeatColor = (
  ratio: number | null,
  onNight: boolean,
): string | undefined => {
  if (ratio == null) return onNight ? "oklch(70% 0 0)" : undefined;
  const t = Math.min(1, Math.max(0, (ratio - 1.5) / (7 - 1.5)));
  const H = 25 + t * 120; // red → green
  const L = onNight ? 78 : 42;
  const C = 0.12 + t * 0.04;
  return `oklch(${L}% ${C.toFixed(3)} ${H.toFixed(1)})`;
};

const LineStripRow = ({
  row,
  contrast,
  fit,
}: {
  row: GoColourRow;
  contrast: ContrastRow | undefined;
  fit: TransformFit;
}) => {
  const brandContrast =
    contrast?.brandOnDayWcag ??
    (row.brand ? wcagContrast(row.brand, GO_DAY_PAPER) : null);
  const dayContrast =
    contrast?.goDayOnDayWcag ??
    (row.goDay ? wcagContrast(row.goDay, GO_DAY_PAPER) : null);
  const nightContrast =
    contrast?.nightOnNightWcag ??
    (row.goNight ? wcagContrast(row.goNight, GO_NIGHT_PAPER) : null);

  const brandDeltaNight = row.brandPlaceholder
    ? null
    : applyBrandNightMethod(row.brand, fit);
  const methodContrast = brandDeltaNight
    ? wcagContrast(brandDeltaNight, GO_NIGHT_PAPER)
    : null;

  const segments: {
    key: string;
    hex: string | null;
    contrast: number | null;
    nightCell?: boolean;
  }[] = [
    { key: "brand", hex: row.brand, contrast: brandContrast },
    { key: "day", hex: row.goDay, contrast: dayContrast },
    {
      key: "night",
      hex: row.goNight,
      contrast: nightContrast,
      nightCell: true,
    },
    {
      key: "method",
      hex: brandDeltaNight,
      contrast: methodContrast,
      nightCell: true,
    },
  ];

  return (
    <div className="grid grid-cols-[minmax(7rem,9rem)_1fr] gap-x-3 text-sm">
      <div className="flex flex-col justify-center py-1">
        <span>{row.label}</span>
        {row.notes ? (
          <span className="text-[11px] leading-snug text-muted-foreground">
            {row.notes}
          </span>
        ) : null}
      </div>

      <div
        className="grid min-w-0 grid-cols-4"
        role="img"
        aria-label={`${row.label} colour strip`}
      >
        {segments.map((seg) => (
          <div
            key={seg.key}
            className="min-w-0 px-1 py-1"
            style={
              seg.nightCell
                ? { backgroundColor: GO_NIGHT_PAPER }
                : undefined
            }
          >
            <p
              className="mb-0.5 font-mono text-[11px] leading-none"
              style={{
                color:
                  contrastHeatColor(seg.contrast, Boolean(seg.nightCell)) ??
                  undefined,
              }}
              title={
                seg.contrast == null
                  ? undefined
                  : `WCAG ${fmtRatio(seg.contrast)}:1 vs ${seg.nightCell ? GO_NIGHT_PAPER : GO_DAY_PAPER}`
              }
            >
              {seg.contrast == null ? "—" : `${fmtRatio(seg.contrast)}:1`}
            </p>
            <div
              className={`w-full ${LINE_H}`}
              style={{
                backgroundColor: seg.hex ?? "transparent",
                opacity: seg.hex ? 1 : 0,
              }}
              title={seg.hex ?? undefined}
            />
            <p
              className={
                seg.nightCell
                  ? "mt-0.5 font-mono text-[11px] leading-tight text-white/45"
                  : "mt-0.5 font-mono text-[11px] leading-tight text-muted-foreground"
              }
            >
              {seg.hex ?? "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const GoColourCompareView = () => {
  const analysis = analyseGoColours(GO_COLOUR_ROWS);
  const { fit, summary, contrastRows, transformRows } = analysis;

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <header className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Temp · colour research
        </p>
        <h1 className="text-2xl font-normal tracking-tight">
          TfL brand vs Go day / night
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Brand Issue-4 tokens beside Go map cores, plus brand with the fitted
          night OKLCH method applied. Night columns sit on charcoal{" "}
          <span className="font-mono text-foreground">{GO_NIGHT_PAPER}</span>
          {" "}(not pitch black). Day→night is the capture-resistant signal.
        </p>
      </header>

      <section className="space-y-3" aria-labelledby="caveat">
        <h2 id="caveat" className="text-base font-normal">
          Capture resistance
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Screenshots + AirDrop shift absolute hex. We do not treat Go samples as
          ground truth. Instead: (1) median day→night OKLCH Δ cancels shared
          capture wash; (2) contrast verdicts compare brand vs Go-night on the
          same fixed charcoal; (3) brand→day residual estimates capture bias.
        </p>
      </section>

      <section className="space-y-4" aria-labelledby="swatches">
        <h2 id="swatches" className="text-base font-normal">
          Swatches
        </h2>
        <p className="text-xs text-muted-foreground">
          Continuous tube-height stroke. Contrast is WCAG vs paper (white /
          {GO_NIGHT_PAPER}) — coloured red→green (weak→strong; ~4.5 AA, ~7 AAA).
          Fourth column = brand + median day→night OKLCH method.
        </p>
        <div className="grid grid-cols-[minmax(7rem,9rem)_1fr] gap-x-3 text-xs text-muted-foreground">
          <div>Line</div>
          <div className="grid grid-cols-4">
            <div>Brand</div>
            <div>Go day</div>
            <div>Go night</div>
            <div>Brand Δ night</div>
          </div>
        </div>
        <div className="space-y-5">
          {GO_COLOUR_ROWS.map((row) => (
            <LineStripRow
              key={row.id}
              row={row}
              contrast={contrastRows.find((c) => c.id === row.id)}
              fit={fit}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="transform">
        <h2 id="transform" className="text-base font-normal">
          OKLCH transform (day → night)
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Fitted pattern (median over {fit.n} chromatic lines):{" "}
          <span className="text-foreground">{fit.pattern}</span>
        </p>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">median ΔL</dt>
            <dd className="font-mono">
              {fit.medianDL == null ? "—" : fmtDelta(fit.medianDL)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">median ΔC</dt>
            <dd className="font-mono">
              {fit.medianDC == null ? "—" : fmtDelta(fit.medianDC)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              capture bias ΔL (brand→day)
            </dt>
            <dd className="font-mono">
              {fit.captureBiasDL == null
                ? "—"
                : fmtDelta(fit.captureBiasDL)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              capture bias ΔC (brand→day)
            </dt>
            <dd className="font-mono">
              {fit.captureBiasDC == null
                ? "—"
                : fmtDelta(fit.captureBiasDC)}
            </dd>
          </div>
        </dl>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-3 font-normal">Line</th>
                <th className="py-2 pr-3 font-normal">Day→night ΔL</th>
                <th className="py-2 pr-3 font-normal">ΔC</th>
                <th className="py-2 pr-3 font-normal">ΔH°</th>
                <th className="py-2 font-normal">Brand→day ΔL (bias)</th>
              </tr>
            </thead>
            <tbody>
              {transformRows
                .filter((r) => r.dayToNight || r.brandToDay)
                .map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="py-2 pr-3">{r.label}</td>
                    <td className="py-2 pr-3 font-mono">
                      {r.dayToNight ? fmtDelta(r.dayToNight.dL) : "—"}
                    </td>
                    <td className="py-2 pr-3 font-mono">
                      {r.dayToNight ? fmtDelta(r.dayToNight.dC) : "—"}
                    </td>
                    <td className="py-2 pr-3 font-mono">
                      {r.dayToNight
                        ? fmtDelta(r.dayToNight.dHSigned, 1)
                        : "—"}
                    </td>
                    <td className="py-2 font-mono">
                      {r.brandToDay ? fmtDelta(r.brandToDay.dL) : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="contrast">
        <h2 id="contrast" className="text-base font-normal">
          Contrast on night paper
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Brand colour on charcoal vs Go night sample on the same charcoal.
          WCAG 2.1 ratio and APCA Lc (|Lc|≥30 soft floor for map strokes).
          “Seeking” = APCA |Lc| gain ≥3 and brand was under 60 — likely a dark-mode
          contrast tweak rather than capture noise alone.
        </p>
        <p className="text-sm text-muted-foreground">
          {summary.contrastSeekingCount} lines flagged contrast-seeking
          {summary.contrastSeekingIds.length > 0
            ? `: ${summary.contrastSeekingIds.join(", ")}`
            : "."}
          {summary.contrastQuieterIds.length > 0 ? (
            <>
              {" "}
              Quieter on charcoal: {summary.contrastQuieterIds.join(", ")}.
            </>
          ) : null}
          {summary.avgApcaGain != null ? (
            <>
              {" "}
              Mean APCA |Lc| gain{" "}
              <span className="font-mono text-foreground">
                {fmtDelta(summary.avgApcaGain, 1)}
              </span>
              .
            </>
          ) : null}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-3 font-normal">Line</th>
                <th className="py-2 pr-3 font-normal">Brand WCAG</th>
                <th className="py-2 pr-3 font-normal">Night WCAG</th>
                <th className="py-2 pr-3 font-normal">Δ</th>
                <th className="py-2 pr-3 font-normal">Brand APCA</th>
                <th className="py-2 pr-3 font-normal">Night APCA</th>
                <th className="py-2 pr-3 font-normal">|Lc| Δ</th>
                <th className="py-2 font-normal">Flag</th>
              </tr>
            </thead>
            <tbody>
              {contrastRows.map((r) => (
                <tr key={r.id} className="border-b border-border/60">
                  <td className="py-2 pr-3">{r.label}</td>
                  <td className="py-2 pr-3 font-mono">
                    {r.brandPlaceholder ? "—" : fmtRatio(r.brandOnNightWcag)}
                  </td>
                  <td className="py-2 pr-3 font-mono">
                    {fmtRatio(r.nightOnNightWcag)}
                  </td>
                  <td className="py-2 pr-3 font-mono">
                    {r.brandPlaceholder || r.wcagGain == null
                      ? "—"
                      : fmtDelta(r.wcagGain, 2)}
                  </td>
                  <td className="py-2 pr-3 font-mono">
                    {r.brandPlaceholder ? "—" : fmtLc(r.brandOnNightApca)}
                  </td>
                  <td className="py-2 pr-3 font-mono">
                    {fmtLc(r.nightOnNightApca)}
                  </td>
                  <td className="py-2 pr-3 font-mono">
                    {r.brandPlaceholder || r.apcaGain == null
                      ? "—"
                      : fmtDelta(r.apcaGain, 1)}
                  </td>
                  <td className="py-2">
                    {r.brandPlaceholder
                      ? "n/a"
                      : r.contrastSeeking
                        ? "seeking"
                        : r.contrastQuieter
                          ? "quieter"
                          : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 pb-8" aria-labelledby="readout">
        <h2 id="readout" className="text-base font-normal">
          Readout
        </h2>
        <ul className="max-w-2xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Night paper is charcoal <span className="font-mono text-foreground">{GO_NIGHT_PAPER}</span>, not
            black — brand Northern fill fails; Go adds a near-white outline.
          </li>
          <li>
            Capture-resistant night pattern: raise OKLCH L (~3%), hold hue, chroma
            mostly stable — not a wholesale rehue.
          </li>
          <li>
            Contrast-seeking lifts (Victoria, District, Circle, Waterloo &amp; City,
            Piccadilly via WCAG) support “brighter for dark paper.” Some lines
            (Jubilee, Overground, Bakerloo) read quieter — hierarchy or capture,
            not a single global boost.
          </li>
          <li>
            Do not replace Issue-4 brand tokens with screenshot hex; use day→night
            OKLCH deltas if shipping a Go-like dark map theme.
          </li>
        </ul>
      </section>
    </div>
  );
};
