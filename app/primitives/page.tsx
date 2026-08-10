import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHub } from "@/components/docs/section-hub";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Rendering primitives",
  description:
    "Rendering primitives — explicit values, TfL-style visual structures.",
};

export default function PrimitivesIndexPage() {
  const entry = getDocsEntry("primitives-index");
  if (!entry) notFound();

  return (
    <SectionHub
      entry={entry}
      purpose="Discoverable presentational building blocks that accept explicit values and remain useful independently of tfl-ts. Composed by data-aware components; usable directly when you need control."
      comingSoon={["Status treatment atoms", "Markers & interchange atoms"]}
      relatedHrefs={[
        { href: "/interfaces", label: "Data-aware components" },
        { href: "/maps/schematic", label: "Schematic maps" },
        { href: "/tools/typography", label: "Station typography tool" },
      ]}
    />
  );
}
