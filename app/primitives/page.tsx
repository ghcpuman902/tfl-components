import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionPlaceholder } from "@/components/docs/section-placeholder";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Primitives",
  description:
    "Rendering primitives — explicit values, TfL-style visual structures.",
};

export default function PrimitivesIndexPage() {
  const entry = getDocsEntry("primitives-index");
  if (!entry) notFound();

  return (
    <SectionPlaceholder
      entry={entry}
      purpose="Discoverable presentational building blocks that accept explicit values and remain useful independently of tfl-ts. Composed by Interfaces; usable directly when you need control."
      futureSlots={[
        "Line & route geometry",
        "Stops & labels",
        "Status treatments",
        "Markers & interchange",
      ]}
      relatedHrefs={[
        { href: "/interfaces", label: "Interfaces — data-aware compositions" },
        { href: "/maps/schematic", label: "Schematic maps" },
      ]}
    />
  );
}
