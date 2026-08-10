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

const PRIMITIVE_SLUGS = new Set(["line-strip", "branch-strip"]);

export const generateStaticParams = () =>
  [...PRIMITIVE_SLUGS].map((slug) => ({ slug }));

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { slug } = await params;
  return componentDocsMetadata(slug);
};

export default async function PrimitivesComponentPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = getDocsEntry(slug);
  if (!entry || entry.group !== "primitives" || !PRIMITIVE_SLUGS.has(slug)) {
    notFound();
  }
  return renderComponentDocs({
    slug,
    relatedLinks: [
      {
        href: "/maps/schematic",
        label: "Maps → Schematic & network (topology overview)",
      },
    ],
  });
}
