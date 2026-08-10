import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { ExploreWipNotice } from "@/components/docs/explore-wip-notice";
import { LineColorBar } from "@/components/tfl/brand/line-badge";
import { ExploreBodySkeleton } from "@/components/tfl/page-skeletons";
import { getDocsEntry } from "@/lib/docs-catalog";
import { getTflClient } from "@/lib/tfl/client";

export const metadata: Metadata = {
  title: "Browse lines",
  description: "Browse TfL lines grouped by transport mode.",
};

const MODES = [
  { id: "tube", label: "Tube" },
  { id: "elizabeth-line", label: "Elizabeth line" },
  { id: "dlr", label: "DLR" },
  { id: "overground", label: "Overground" },
  { id: "tram", label: "Tram" },
] as const;

async function getCachedModeGroups() {
  "use cache";
  cacheLife({ revalidate: 300 });
  cacheTag("tfl-explore-modes");

  const client = getTflClient();
  return Promise.all(
    MODES.map(async (mode) => {
      const lines = await client.line.get({ modes: [mode.id] });
      return { mode, lines };
    }),
  );
}

async function BrowseLinesBody() {
  const groups = await getCachedModeGroups();

  return (
    <>
      {groups.map(({ mode, lines }) => (
        <section key={mode.id} className="space-y-3">
          <h2 className="text-xl font-semibold">{mode.label}</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {lines.map((line) => {
              return (
                <li key={line.id}>
                  <Link
                    href={`/explore/routes?lineId=${encodeURIComponent(line.id ?? "")}`}
                    className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
                  >
                    <span
                      data-line={line.id ?? undefined}
                      className="tfl-dark-line-text font-semibold text-[var(--line-color)]"
                    >
                      {line.name}
                    </span>
                    <div className="mt-2">
                      <LineColorBar
                        lineId={line.id}
                        modeName={line.modeName ?? mode.id}
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

export default async function BrowseLinesPage() {
  const entry = getDocsEntry("browse-lines")!;
  const { default: MDXPage } = await import(
    "@/content/explore/browse-lines.mdx"
  );

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <ExploreWipNotice />
        <DocsPageHeader entry={entry} />
        <Suspense fallback={<ExploreBodySkeleton />}>
          <BrowseLinesBody />
        </Suspense>
        <section className="border-t border-border pt-8">
          <MDXPage />
        </section>
      </article>
    </DocsReadableWidth>
  );
}
