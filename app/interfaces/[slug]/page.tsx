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

const INTERFACE_SLUGS = new Set([
  "tube-status-board",
  "arrivals-board",
]);

export const generateStaticParams = () =>
  [...INTERFACE_SLUGS].map((slug) => ({ slug }));

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { slug } = await params;
  return componentDocsMetadata(slug);
};

export default async function InterfacesComponentPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = getDocsEntry(slug);
  if (!entry || entry.group !== "interfaces" || !INTERFACE_SLUGS.has(slug)) {
    notFound();
  }

  const relatedBySlug: Record<string, { href: string; label: string }[]> = {
    "tube-status-board": [
      { href: "/foundations/line-badge", label: "Foundations — Line colours & badges" },
      { href: "/foundations/tfl-roundel", label: "Foundations — Roundel" },
      { href: "/blocks/week-ahead", label: "Blocks — Week ahead" },
      { href: "/explore/lines", label: "Explore — Browse lines" },
    ],
    "arrivals-board": [
      { href: "/foundations/line-badge", label: "Foundations — Line colours & badges" },
      { href: "/explore/routes", label: "Explore — Route stations" },
    ],
  };

  return renderComponentDocs({
    slug,
    relatedLinks: relatedBySlug[slug] ?? [],
  });
}
