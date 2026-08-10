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

const PRIMITIVE_SLUGS = new Set(["branch-strip", "station-name"]);

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
        href: "/interfaces/line-strip",
        label: "Line strip (data-aware)",
      },
      {
        href: "/maps/schematic",
        label: "Maps → Schematic & network",
      },
      {
        href: "/blocks/week-ahead",
        label: "Blocks — Week ahead",
      },
      {
        href: "/tools/typography",
        label: "Tools — Station typography",
      },
      ...(slug === "station-name"
        ? [
            {
              href: "/foundations/station-labels",
              label: "Foundations — Station labels",
            },
            { href: "/primitives/branch-strip", label: "Branch strip" },
          ]
        : [{ href: "/primitives/station-name", label: "Station name" }]),
    ],
  });
}
