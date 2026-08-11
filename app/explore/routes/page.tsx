import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { ExploreWipNotice } from "@/components/docs/explore-wip-notice";
import { LineColorBar } from "@/components/tfl/brand/line-badge";
import { RoutePageSkeleton } from "@/components/tfl/page-skeletons";
import { getDocsEntry } from "@/lib/docs-catalog";
import { getTflClient } from "@/lib/tfl/client";

export const metadata: Metadata = {
  title: "Route stations",
  description: "Stops and sequence for a single TfL line.",
};

type PageProps = {
  searchParams: Promise<{ lineId?: string; direction?: string }>;
};

async function getCachedRoute(
  lineId: string,
  direction: "inbound" | "outbound",
) {
  "use cache";
  cacheLife({ revalidate: 300 });
  cacheTag("tfl-route", `tfl-route-${lineId}-${direction}`);

  const client = getTflClient();
  const [lines, sequence] = await Promise.all([
    client.line.get({ lineIds: [lineId] }),
    client.line.getRouteSequence({ id: lineId, direction }),
  ]);

  return {
    line: lines[0],
    stops:
      sequence.stopPointSequences?.flatMap((seq) => seq.stopPoint ?? []) ?? [],
  };
}

async function RouteFromParams({ searchParams }: PageProps) {
  const params = await searchParams;
  const lineId = (params.lineId ?? "central").toLowerCase();
  const direction = (
    params.direction === "outbound" ? "outbound" : "inbound"
  ) as "inbound" | "outbound";

  const { line, stops } = await getCachedRoute(lineId, direction);

  return (
    <>
      <div>
        <h2
          data-line={lineId}
          className="tfl-title tfl-dark-line-text text-2xl text-[var(--line-color)]"
        >
          {line?.name ?? lineId} route
        </h2>
        <div className="mt-2 max-w-md">
          <LineColorBar
            lineId={lineId}
            modeName={line?.modeName}
            heightClass="h-[6px]"
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Direction:{" "}
          <Link
            href={`/explore/routes?lineId=${lineId}&direction=inbound`}
            className={
              direction === "inbound"
                ? "font-semibold text-foreground"
                : "underline"
            }
          >
            inbound
          </Link>
          {" · "}
          <Link
            href={`/explore/routes?lineId=${lineId}&direction=outbound`}
            className={
              direction === "outbound"
                ? "font-semibold text-foreground"
                : "underline"
            }
          >
            outbound
          </Link>
          {" · "}
          <Link href="/explore/lines" className="underline">
            all lines
          </Link>
        </p>
      </div>

      {stops.length === 0 ? (
        <p className="text-muted-foreground">
          No stop sequence returned for this line.
        </p>
      ) : (
        <ol className="space-y-1" role="list">
          {stops.map((stop, index) => (
            <li
              key={`${stop.id ?? stop.name}-${index}`}
              className="flex items-baseline gap-3 border-b border-border py-2 text-sm last:border-0"
            >
              <span className="w-8 tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <span className="font-medium">{stop.name ?? "Unknown"}</span>
              {stop.id ? (
                <code className="ml-auto text-xs text-muted-foreground">
                  {stop.id}
                </code>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

export default async function RouteStationsPage({ searchParams }: PageProps) {
  const entry = getDocsEntry("route-stations")!;
  const { default: MDXPage } = await import(
    "@/content/explore/route-stations.mdx"
  );

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <ExploreWipNotice />
        <DocsPageHeader entry={entry} />
        <Suspense fallback={<RoutePageSkeleton />}>
          <RouteFromParams searchParams={searchParams} />
        </Suspense>
        <section className="border-t border-border pt-8">
          <MDXPage />
        </section>
      </article>
    </DocsReadableWidth>
  );
}
