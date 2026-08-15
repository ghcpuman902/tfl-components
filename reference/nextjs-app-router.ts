/**
 * COPY-PASTE REFERENCE — tube / rail status board (showcase-aligned)
 *
 * Paste into YOUR app (e.g. Next.js App Router `app/status/page.tsx`).
 * This file is NOT compiled or run by the tfl-ts package. No React dependency
 * is required by tfl-ts — adapt the JSX to Vue, Svelte, plain HTML, etc.
 *
 * Data → UI contract (framework-agnostic):
 *   1. line.getStatus for tube + rail modes
 *   2. sortLinesBySeverityAndOrder({ now: fetchedAt })
 *   3. read getWorstCurrentStatus / getStatusKind — not lineStatuses[0]
 *   4. live board: disruptions (closed sorted last) then good service
 *   5. brand titles/bars with getLineInlineStyles + getLineCssProps
 *
 * Live reference UI: https://tfl.manglekuo.com/docs/tube-rail-status
 *
 * Prerequisites in YOUR app:
 *   pnpm add tfl-ts
 *   TFL_APP_KEY (Primary key) in server env only
 */

import TflClient, {
  sortLinesBySeverityAndOrder,
  getLineInlineStyles,
  getLineCssProps,
  getSeverityClasses,
  getStatusKind,
  getWorstCurrentStatus,
} from 'tfl-ts';

/** ISR-friendly: line status changes on disruptions — ~60s is enough. */
export const revalidate = 60;

const hasOvergroundStripe = (modeName?: string) =>
  modeName === 'overground' || modeName === 'elizabeth-line';

const stripStatusReason = (reason: string, lineName?: string) =>
  reason
    .replace(new RegExp(`^${lineName?.toUpperCase()}( LINE)?: `, 'i'), '')
    .replace(
      /^(Hammersmith and City Line: )|(London Overground: )|(Docklands Light Railway: )\s*/,
      '',
    );

const getLineStatuses = async () => {
  const client = new TflClient();
  const fetchedAt = Date.now();
  const statuses = await client.line.getStatus({
    modes: ['tube', 'elizabeth-line', 'dlr', 'tram', 'overground'],
  });
  return {
    lines: sortLinesBySeverityAndOrder(statuses, { now: fetchedAt }),
    fetchedAt,
  };
};

const sectionForLine = (
  line: { lineStatuses?: Parameters<typeof getWorstCurrentStatus>[0] },
  fetchedAt: number,
) => {
  const worst = getWorstCurrentStatus(line.lineStatuses, { now: fetchedAt });
  const kind = getStatusKind(worst ?? 10);
  return kind === 'good' || kind === 'info' ? 'goodService' : 'disruptions';
};

export default async function StatusPage() {
  const { lines, fetchedAt } = await getLineStatuses();
  const disrupted = lines.filter((line) => sectionForLine(line, fetchedAt) === 'disruptions');
  const goodService = lines.filter((line) => sectionForLine(line, fetchedAt) === 'goodService');

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-8">
      <h1 className="text-2xl font-bold">London line status</h1>

      {disrupted.length > 0 && (
        <section aria-label="Service disruptions">
          <h2 className="mb-3 text-lg font-semibold">Service disruptions</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {disrupted.map((line) => {
              const styles = getLineInlineStyles(line.id ?? '');
              const cssProps = getLineCssProps(line.id ?? '');

              return (
                <li
                  key={line.id}
                  className="flex flex-col gap-1 border border-neutral-200 p-4"
                  style={cssProps}
                >
                  <h3
                    className="tfl-dark-line-text text-lg font-semibold"
                    style={{ color: styles.color }}
                  >
                    {line.name}
                  </h3>
                  {/* Color bar: brand hex via --line-color; Overground/Elizabeth get a white stripe */}
                  <div className="relative h-[6px] w-full">
                    <div
                      className="h-full w-full dark:bg-[var(--line-dark-fill)] dark:[box-shadow:var(--line-dark-box-shadow)]"
                      style={{ backgroundColor: 'var(--line-color)' }}
                    />
                    {hasOvergroundStripe(line.modeName) && (
                      <div className="absolute left-0 top-[2px] h-[2px] w-full bg-white" />
                    )}
                  </div>

                  {(() => {
                    const worst = getWorstCurrentStatus(line.lineStatuses, {
                      now: fetchedAt,
                    });
                    if (!worst) return null;
                    const severity = getSeverityClasses(worst.statusSeverity ?? 10, true);
                    return (
                      <div className="mt-2">
                        <span className={`font-medium ${severity.text} ${severity.animation}`}>
                          {worst.statusSeverityDescription}
                        </span>
                        {worst.reason && (
                          <span className="mt-1 block text-sm text-neutral-600">
                            {stripStatusReason(worst.reason, line.name)}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-label="Good service">
        <h2 className="mb-3 text-lg font-semibold">Good service</h2>
        <ul className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" role="list">
          {goodService.map((line) => {
            const styles = getLineInlineStyles(line.id ?? '');
            const cssProps = getLineCssProps(line.id ?? '');

            return (
              <li
                key={line.id}
                className="flex flex-col gap-2 border border-neutral-200 p-3"
                style={cssProps}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className="tfl-dark-line-text text-sm font-semibold leading-tight"
                    style={{ color: styles.color }}
                  >
                    {line.name}
                  </h3>
                </div>
                <div className="relative h-[4px] w-full">
                  <div
                    className="h-full w-full dark:bg-[var(--line-dark-fill)] dark:[box-shadow:var(--line-dark-box-shadow)]"
                    style={{ backgroundColor: 'var(--line-color)' }}
                  />
                  {hasOvergroundStripe(line.modeName) && (
                    <div className="absolute left-0 top-[1px] h-[2px] w-full bg-white" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

/**
 * Static metadata (no API call) — use anywhere:
 *
 *   const client = new TflClient();
 *   const displayName = client.line.LINE_NAMES['central']; // "Central"
 *
 * Do NOT call getStatus() just to get line names.
 */
