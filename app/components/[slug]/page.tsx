import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { getComponentEntries, getDocsEntry } from "@/lib/docs-catalog";
import { loadComponentDemo } from "@/lib/load-component-demo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const generateStaticParams = () =>
  getComponentEntries().map((entry) => ({ slug: entry.slug }));

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { slug } = await params;
  const entry = getDocsEntry(slug);
  if (!entry || entry.kind !== "component") {
    return { title: "Not found" };
  }
  return {
    title: entry.title,
    description: entry.description,
  };
};

export default async function ComponentDocsPage({ params }: PageProps) {
  const { slug } = await params;
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
        <DocsPageHeader entry={entry} />

        {Demo ? (
          <section className="space-y-3" aria-labelledby="preview-heading">
            <h2 id="preview-heading" className="text-lg font-semibold">
              Preview
            </h2>
            {/*
              Cache Components (`instant` shell): dynamically imported demos pull
              client modules (StationName, interactive controls). Keep them out of
              the static shell so client reference factories resolve under Suspense.
            */}
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
      </article>
    </DocsReadableWidth>
  );
}
