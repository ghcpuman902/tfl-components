import type { Metadata } from "next";
import Link from "next/link";
import { getLineCssProps, getLineInlineStyles } from "tfl-ts";
import { SiteHeader } from "@/components/site-header";
import { LineColorBar } from "@/components/tfl/line-badge";
import { getTflClient } from "@/lib/tfl/client";

export const metadata: Metadata = {
  title: "Route detail — tfl-components",
  description: "Stops and sequence for a single TfL line.",
};

export const revalidate = 300;

type PageProps = {
  searchParams: Promise<{ lineId?: string; direction?: string }>;
};

export default async function RoutePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const lineId = (params.lineId ?? "central").toLowerCase();
  const direction = (params.direction === "outbound" ? "outbound" : "inbound") as
    | "inbound"
    | "outbound";

  const client = getTflClient();
  const [lines, sequence] = await Promise.all([
    client.line.get({ lineIds: [lineId] }),
    client.line.getRouteSequence({ id: lineId, direction }),
  ]);
  const line = lines[0];
  const styles = getLineInlineStyles(lineId);
  const cssProps = getLineCssProps(lineId);
  const stops =
    sequence.stopPointSequences?.flatMap((seq) => seq.stopPoint ?? []) ?? [];

  return (
    <div className="min-h-svh">
      <SiteHeader pathname="/route" />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div>
          <h1
            className="text-3xl font-bold dark:[text-shadow:var(--line-dark-text-shadow)]"
            style={{ color: styles.color, ...cssProps }}
          >
            {line?.name ?? lineId} route
          </h1>
          <div className="mt-2 max-w-md">
            <LineColorBar lineId={lineId} modeName={line?.modeName} heightClass="h-[6px]" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Direction:{" "}
            <Link
              href={`/route?lineId=${lineId}&direction=inbound`}
              className={direction === "inbound" ? "font-semibold text-foreground" : "underline"}
            >
              inbound
            </Link>
            {" · "}
            <Link
              href={`/route?lineId=${lineId}&direction=outbound`}
              className={direction === "outbound" ? "font-semibold text-foreground" : "underline"}
            >
              outbound
            </Link>
          </p>
        </div>

        {stops.length === 0 ? (
          <p className="text-muted-foreground">No stop sequence returned for this line.</p>
        ) : (
          <ol className="space-y-1" role="list">
            {stops.map((stop, index) => (
              <li
                key={`${stop.id ?? stop.name}-${index}`}
                className="flex items-baseline gap-3 border-b border-border py-2 text-sm last:border-0"
              >
                <span className="w-8 tabular-nums text-muted-foreground">{index + 1}</span>
                <span className="font-medium">{stop.name ?? "Unknown"}</span>
                {stop.id && (
                  <code className="ml-auto text-xs text-muted-foreground">{stop.id}</code>
                )}
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
