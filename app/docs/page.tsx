import type { Metadata } from "next";
import Link from "next/link";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Introduction",
  description:
    "Open React components for London transport, copied into your app via the shadcn registry.",
};

export default function DocsIntroductionPage() {
  const entry = getDocsEntry("introduction")!;

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry} />

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">What this is</h2>
          <p className="max-w-prose text-muted-foreground">
            A developer environment for turning TfL information into useful
            React UI. Pair{" "}
            <a
              href="https://www.npmjs.com/package/tfl-ts"
              className="text-foreground underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              tfl-ts
            </a>{" "}
            (normalised data) with installable components from this registry
            (Open Code — source lands in your app).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Fast path</h2>
          <ol className="list-inside list-decimal space-y-2 text-muted-foreground">
            <li>
              <Link
                href="/docs/installation"
                className="text-foreground underline underline-offset-4"
              >
                Install
              </Link>{" "}
              a preferred board with the shadcn CLI
            </li>
            <li>
              Fetch normalised data in your app (or use fixtures for demos)
            </li>
            <li>
              Pass data as props — see{" "}
              <Link
                href="/docs/components"
                className="text-foreground underline underline-offset-4"
              >
                Components
              </Link>
            </li>
          </ol>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Layers</h2>
          <p className="max-w-prose text-muted-foreground">
            Prefer high-level boards first (arrivals, status, maps). Rendering
            parts and foundations sit underneath for control. Modes are
            metadata on components — not separate Tube/Bus product trees.
          </p>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
