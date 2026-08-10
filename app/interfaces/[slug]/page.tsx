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
  "line-strip",
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
      { href: "/foundations/line-badge", label: "Line colours & badges" },
      { href: "/foundations/tfl-roundel", label: "Roundel" },
      { href: "/blocks/week-ahead", label: "Week ahead Block" },
      { href: "/explore/lines", label: "Browse lines" },
    ],
    "arrivals-board": [
      { href: "/foundations/line-badge", label: "Line colours & badges" },
      { href: "/explore/routes", label: "Route stations" },
    ],
    "line-strip": [
      { href: "/primitives/branch-strip", label: "Branch strip" },
      { href: "/primitives/station-name", label: "Station name" },
      { href: "/maps/schematic", label: "Schematic & network" },
      { href: "/blocks/week-ahead", label: "Week ahead Block" },
      { href: "/tools/typography", label: "Station typography tool" },
    ],
  };

  return renderComponentDocs({
    slug,
    relatedLinks: relatedBySlug[slug] ?? [],
  });
}
