import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
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
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Batch status — tfl-components",
  description: "Status for a curated set of TfL lines in one request.",
};

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

async function getCachedBatchStatuses() {
  "use cache";
  cacheLife({ revalidate: 60 });
  cacheTag("tfl-batch-status");

  const client = getTflClient();
  const statuses = await client.line.getStatus({
    lineIds: [...BATCH_LINE_IDS],
  });
  return sortLinesBySeverityAndOrder(statuses);
}

async function BatchStatusBody() {
  const sorted = await getCachedBatchStatuses();

  return (
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
  );
}

export default function BatchStatusPage() {
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

        <Suspense
          fallback={
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          }
        >
          <BatchStatusBody />
        </Suspense>
      </main>
    </div>
  );
}
