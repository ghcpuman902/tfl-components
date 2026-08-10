import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { InstallCommand } from "@/components/docs/install-command";
import { RelationshipBadges } from "@/components/docs/relationship-badges";
import {
  getContentAssetSlug,
  getDocsEntry,
  getUsedBySlugs,
  type DocsEntry,
} from "@/lib/docs-catalog";
import { loadComponentDemo } from "@/lib/load-component-demo";
import { SyntaxHighlightedCode } from "@/components/docs/syntax-highlighted-code";

type RelatedLink = { href: string; label: string };

type RenderComponentDocsOptions = {
  /** Catalog slug (also MDX / demo filename). */
  slug: string;
  /** Extra related links under the MDX body. */
  relatedLinks?: readonly RelatedLink[];
  /** Compact get-data → render example for data-aware pages. */
  getDataExample?: string;
};

const DATA_AWARE_GET_DATA: Record<string, string> = {
  "tube-status-board": `const data = sortLinesBySeverityAndOrder(
  await tfl.line.getStatus({ modes: ["tube", "elizabeth-line"] }),
)

<TubeStatusBoard data={data} />`,
  "arrivals-board": `const data = await tfl.stopPoint.getArrivals({
  stopPointIds: ["940GZZLUOXC"],
  sortBy: "timeToStation",
})

<ArrivalsBoard data={data} stopName="Oxford Circus" />`,
  "line-strip": `const spine = await getLineSpine("victoria")

<LineStrip lineId="victoria" spine={spine} fit />`,
};

export const componentDocsMetadata = async (
  slug: string,
): Promise<Metadata> => {
  const entry = getDocsEntry(slug);
  if (!entry || entry.kind !== "component") {
    return { title: "Not found" };
  }
  return {
    title: entry.title,
    description: entry.description,
  };
};

export const renderComponentDocs = async ({
  slug,
  relatedLinks = [],
  getDataExample,
}: RenderComponentDocsOptions) => {
  const entry = getDocsEntry(slug);
  if (!entry || entry.kind !== "component") notFound();

  const contentSlug = getContentAssetSlug(slug);
  const Demo = await loadComponentDemo(contentSlug);
  const isDataAware = entry.layer === "data-aware";
  const snippet =
    getDataExample ??
    (isDataAware
      ? (DATA_AWARE_GET_DATA[contentSlug] ?? DATA_AWARE_GET_DATA[slug])
      : undefined);
  const usedBy = getUsedBySlugs(entry.slug);

  let MDXPage: React.ComponentType<{ className?: string }> | null = null;
  try {
    const mod = await import(`@/content/components/${contentSlug}.mdx`);
    MDXPage = mod.default;
  } catch {
    // Bus arrivals reuses arrivals-board MDX when no bus-specific file.
    if (contentSlug === "bus-arrivals-board") {
      try {
        const mod = await import(`@/content/components/arrivals-board.mdx`);
        MDXPage = mod.default;
      } catch {
        MDXPage = null;
      }
    } else {
      MDXPage = null;
    }
  }

  return (
    <DocsReadableWidth>
      <article className="space-y-10">
        <DocsPageHeader
          entry={entry as DocsEntry}
          preferPreview={isDataAware}
          getDataSnippet={
            snippet ? (
              <SyntaxHighlightedCode code={snippet} language="tsx" />
            ) : undefined
          }
        />

        {Demo ? (
          <section className="space-y-3" aria-labelledby="preview-heading">
            <h2 id="preview-heading" className="text-lg font-semibold">
              Preview
            </h2>
            <Suspense
              fallback={
                <div
                  className="h-40 animate-pulse rounded-lg bg-muted"
                  aria-hidden
                />
              }
            >
              <Demo />
            </Suspense>
          </section>
        ) : null}

        {isDataAware && entry.registryUrl ? (
          <section className="space-y-2" aria-labelledby="install-heading">
            <h2 id="install-heading" className="text-lg font-semibold">
              Installation
            </h2>
            <InstallCommand registryUrl={entry.registryUrl} />
          </section>
        ) : null}

        {MDXPage ? (
          <section className="border-t border-border pt-8">
            <Suspense fallback={null}>
              <MDXPage />
            </Suspense>
          </section>
        ) : null}

        {(entry.builtWith?.length ||
          entry.usesFoundations?.length ||
          usedBy.length > 0) && (
          <section
            className="space-y-3 border-t border-border pt-8"
            aria-labelledby="composition-heading"
          >
            <h2 id="composition-heading" className="text-lg font-semibold">
              Composition
            </h2>
            <RelationshipBadges
              builtWith={entry.builtWith}
              usesFoundations={entry.usesFoundations}
              usedBy={usedBy}
            />
          </section>
        )}

        {relatedLinks.length > 0 ? (
          <section
            className="border-t border-border pt-8"
            aria-labelledby="related-heading"
          >
            <h2 id="related-heading" className="text-lg font-semibold">
              Related
            </h2>
            <ul className="mt-3 list-inside list-disc text-sm text-muted-foreground">
              {relatedLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </DocsReadableWidth>
  );
};
