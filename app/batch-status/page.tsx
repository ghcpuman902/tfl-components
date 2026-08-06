import type { Metadata } from "next";
import Link from "next/link";
import {
  getLineCssProps,
  getLineInlineStyles,
  getSeverityClasses,
  isNormalService,
  sortLinesBySeverityAndOrder,
} from "tfl-ts";
import { SiteHeader } from "@/components/site-header";
import { LineColorBar } from "@/components/tfl/line-badge";
import { getTflClient } from "@/lib/tfl/client";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Batch status — tfl-components",
  description: "Status for a curated set of TfL lines in one request.",
};

export const revalidate = 60;

const BATCH_LINE_IDS = [
  "central",
  "northern",
  "victoria",
  "jubilee",
  "elizabeth",
  "bakerloo",
  "piccadilly",
  "district",
] as const;

export default async function BatchStatusPage() {
  const client = getTflClient();
  const statuses = await client.line.getStatus({
    lineIds: [...BATCH_LINE_IDS],
  });
  const sorted = sortLinesBySeverityAndOrder(statuses);

  return (
    <div className="min-h-svh">
      <SiteHeader pathname="/batch-status" />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-3xl font-bold">Batch line status</h1>
          <p className="mt-2 text-muted-foreground">
            One request for a fixed set of line IDs:{" "}
            <code className="rounded bg-muted px-1 text-xs">
              {BATCH_LINE_IDS.join(", ")}
            </code>
          </p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="list">
          {sorted.map((line) => {
            const styles = getLineInlineStyles(line.id ?? "");
            const cssProps = getLineCssProps(line.id ?? "");
            const normal = isNormalService(line.lineStatuses ?? []);
            const worst = line.lineStatuses?.[0];
            const severity = getSeverityClasses(worst?.statusSeverity ?? 10, !normal);

            return (
              <li
                key={line.id}
                className="rounded-lg border border-border bg-card p-3"
              >
                <h2
                  className="font-semibold dark:[text-shadow:var(--line-dark-text-shadow)]"
                  style={{ color: styles.color, ...cssProps }}
                >
                  {line.name}
                </h2>
                <div className="mt-2">
                  <LineColorBar lineId={line.id} modeName={line.modeName} />
                </div>
                <p className={cn("mt-2 text-sm font-medium", severity.text)}>
                  {worst?.statusSeverityDescription ?? "Unknown"}
                </p>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
