import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  componentDocsMetadata,
  renderComponentDocs,
} from "@/components/docs/render-component-docs";
import { getDocsEntry } from "@/lib/docs-catalog";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const FOUNDATION_SLUGS = new Set(["tfl-roundel", "line-badge"]);

export const generateStaticParams = () =>
  [...FOUNDATION_SLUGS].map((slug) => ({ slug }));

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { slug } = await params;
  return componentDocsMetadata(slug);
};

export default async function FoundationsComponentPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = getDocsEntry(slug);
  if (!entry || entry.group !== "foundations" || !FOUNDATION_SLUGS.has(slug)) {
    notFound();
  }
  return renderComponentDocs({ slug });
}
