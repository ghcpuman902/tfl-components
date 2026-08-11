import type { Metadata } from "next";
import Link from "next/link";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { Badge } from "@/components/ui/badge";
import {
  getCatalogueEntries,
  getDocsEntry,
  layerBadgeLabel,
  MODE_MARKER_COLOURS,
} from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Components",
  description:
    "Catalogue of embeddable TfL surfaces — preferred boards first, then rendering parts.",
};

export default function DocsComponentsCataloguePage() {
  const entry = getDocsEntry("components-index")!;
  const items = getCatalogueEntries();

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry} />

        <section className="space-y-3">
          <h2 id="how-to-choose" className="text-lg font-semibold">
            How to choose
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Start with preferred boards (marked in the sidebar). They accept
            normalised data as props. Lower rows are rendering parts for finer
            control. Composition: data-aware → primitives → foundations.
          </p>
        </section>

        <section className="space-y-1" aria-label="Component catalogue">
          <ul className="divide-y divide-border border-y border-border">
            {items.map((item) => {
              const mode = item.modeMarker
                ? MODE_MARKER_COLOURS[item.modeMarker]
                : null;
              return (
                <li key={item.slug}>
                  <Link
                    href={item.href}
                    className="flex flex-col gap-2 py-4 hover:bg-muted/40 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">
                          {item.title}
                        </span>
                        {item.comingSoon ? (
                          <Badge variant="outline">Coming soon</Badge>
                        ) : null}
                        {item.layer ? (
                          <Badge variant="outline">
                            {layerBadgeLabel(item.layer)}
                          </Badge>
                        ) : null}
                        {item.registryUrl ? (
                          <Badge variant="secondary">Installable</Badge>
                        ) : null}
                        {mode ? (
                          <Badge variant="outline">{mode.label}</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <div
                      className="aspect-video w-full max-w-[12rem] shrink-0 rounded-md border border-dashed border-border bg-muted/40 sm:w-48"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-2 border-t border-border pt-8">
          <h2 id="related-blocks" className="text-lg font-semibold">
            Related Blocks
          </h2>
          <p className="text-sm text-muted-foreground">
            Composed mini-apps live under{" "}
            <Link
              href="/blocks"
              className="text-foreground underline underline-offset-4"
            >
              Blocks
            </Link>
            , not in this catalogue.
          </p>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
