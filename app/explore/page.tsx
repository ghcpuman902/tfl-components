import type { Metadata } from "next";
import Link from "next/link";
import { getLineCssProps, getLineInlineStyles } from "tfl-ts";
import { SiteHeader } from "@/components/site-header";
import { LineColorBar } from "@/components/tfl/line-badge";
import { getTflClient } from "@/lib/tfl/client";

export const metadata: Metadata = {
  title: "Explore modes — tfl-components",
  description: "Browse TfL lines grouped by transport mode.",
};

export const revalidate = 300;

const MODES = [
  { id: "tube", label: "Tube" },
  { id: "elizabeth-line", label: "Elizabeth line" },
  { id: "dlr", label: "DLR" },
  { id: "overground", label: "Overground" },
  { id: "tram", label: "Tram" },
] as const;

export default async function ExplorePage() {
  const client = getTflClient();
  const groups = await Promise.all(
    MODES.map(async (mode) => {
      const lines = await client.line.get({ modes: [mode.id] });
      return { mode, lines };
    }),
  );

  return (
    <div className="min-h-svh">
      <SiteHeader pathname="/explore" />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6">
        <div>
          <h1 className="text-3xl font-bold">Explore by mode</h1>
          <p className="mt-2 text-muted-foreground">
            Lines returned by{" "}
            <code className="rounded bg-muted px-1 text-xs">{`line.get({ modes })`}</code>.
            Open a line for route detail.
          </p>
        </div>

        {groups.map(({ mode, lines }) => (
          <section key={mode.id} className="space-y-3">
            <h2 className="text-xl font-semibold">{mode.label}</h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="list">
              {lines.map((line) => {
                const styles = getLineInlineStyles(line.id ?? "");
                const cssProps = getLineCssProps(line.id ?? "");
                return (
                  <li key={line.id}>
                    <Link
                      href={`/route?lineId=${encodeURIComponent(line.id ?? "")}`}
                      className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
                    >
                      <span
                        className="font-semibold dark:[text-shadow:var(--line-dark-text-shadow)]"
                        style={{ color: styles.color, ...cssProps }}
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
      </main>
    </div>
  );
}
