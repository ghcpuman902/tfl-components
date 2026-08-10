import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExploreWipNotice } from "@/components/docs/explore-wip-notice";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Explorer",
  description:
    "Developer-facing TfL information model — what TfL knows and how it relates.",
};

const EXPLORER_VIEWS = [
  { href: "/explore/lines", label: "Browse lines" },
  { href: "/explore/routes", label: "Route stations" },
  { href: "/explore/bus-stops", label: "Bus stops" },
] as const;

export default function DocsExplorerPage() {
  const entry = getDocsEntry("explore-index");
  if (!entry) notFound();

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry} />
        <ExploreWipNotice />

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Purpose</h2>
          <p className="max-w-prose text-muted-foreground">
            Help developers discover TfL information and how entities relate —
            not a list of Unified API endpoint categories. Explorer owns its
            own views; they are not duplicated in the global sidebar.
          </p>
        </section>

        <nav aria-label="Explorer views" className="space-y-2">
          <h2 className="text-lg font-semibold">Views</h2>
          <ul className="space-y-2 text-sm">
            {EXPLORER_VIEWS.map((view) => (
              <li key={view.href}>
                <Link
                  href={view.href}
                  className="text-foreground underline underline-offset-4"
                >
                  {view.label}
                </Link>
              </li>
            ))}
            <li className="text-muted-foreground">
              Relationships — coming soon
            </li>
          </ul>
        </nav>
      </article>
    </DocsReadableWidth>
  );
}
