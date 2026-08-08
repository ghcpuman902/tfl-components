import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
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
    <article className="space-y-10">
      <DocsPageHeader entry={entry} />

      {Demo ? (
        <section className="space-y-3" aria-labelledby="preview-heading">
          <h2 id="preview-heading" className="text-lg font-semibold">
            Preview
          </h2>
          <Demo />
        </section>
      ) : null}

      {MDXPage ? (
        <section className="border-t border-border pt-8">
          <MDXPage />
        </section>
      ) : null}
    </article>
  );
}
