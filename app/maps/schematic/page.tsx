import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionPlaceholder } from "@/components/docs/section-placeholder";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Schematic & network maps",
  description:
    "Topology and transport relationships — not literal geography.",
};

export default function MapsSchematicPage() {
  const entry = getDocsEntry("maps-schematic");
  if (!entry) notFound();

  return (
    <SectionPlaceholder
      entry={entry}
      purpose="Line diagrams, branches, multi-line networks, interchanges, and journey highlighting. Conceptually distinct from geographic maps. Existing line/branch strip work may migrate here or remain cross-linked under Primitives — see migration inventory."
      futureSlots={[
        "Line diagrams",
        "Branch structures",
        "Multi-line network diagrams",
        "Interchange representations",
        "Journey highlighting",
      ]}
      relatedHrefs={[
        { href: "/maps", label: "Maps overview" },
        { href: "/maps/geographic", label: "Geographic maps (different)" },
        { href: "/components/line-strip", label: "Line strip (current)" },
        { href: "/components/branch-strip", label: "Branch strip (current)" },
      ]}
    />
  );
}
