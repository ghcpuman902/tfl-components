import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { getDocsEntry, type DocsEntry } from "@/lib/docs-catalog";
import { loadComponentDemo } from "@/lib/load-component-demo";

type RelatedLink = { href: string; label: string };

type RenderComponentDocsOptions = {
  /** Catalog slug (also MDX / demo filename). */
  slug: string;
  /** Extra related links under the MDX body. */
  relatedLinks?: readonly RelatedLink[];
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
}: RenderComponentDocsOptions) => {
  const entry = getDocsEntry(slug);
  if (!entry || entry.kind !== "component") notFound();

  const Demo = await loadComponentDemo(slug);

  let MDXPage: React.ComponentType<{ className?: string }> | null = null;
  try {
    const mod = await import(`@/content/components/${slug}.mdx`);
    MDXPage = mod.default;
  } catch {
    MDXPage = null;
  }

  return (
    <DocsReadableWidth>
      <article className="space-y-10">
        <DocsPageHeader entry={entry as DocsEntry} />

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

        {MDXPage ? (
          <section className="border-t border-border pt-8">
            <Suspense fallback={null}>
              <MDXPage />
            </Suspense>
          </section>
        ) : null}

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
