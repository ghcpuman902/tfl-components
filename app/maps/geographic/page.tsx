import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionPlaceholder } from "@/components/docs/section-placeholder";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Geographic maps",
  description:
    "Real London geography — coordinates, GeoJSON, provider-independent core.",
};

export default function MapsGeographicPage() {
  const entry = getDocsEntry("maps-geographic");
  if (!entry) notFound();

  return (
    <SectionPlaceholder
      entry={entry}
      purpose="Represent actual London geography. Core geography/data utilities stay renderer-independent; provider adapters (MapLibre, etc.) sit above common data. Prefer interoperable formats such as GeoJSON."
      futureSlots={[
        "Station / stop locations",
        "Line and route geometry",
        "Journey / disruption / vehicle layers",
        "Cycle infrastructure",
        "Provider adapters",
      ]}
      relatedHrefs={[
        { href: "/maps", label: "Maps overview" },
        { href: "/maps/schematic", label: "Schematic & network (different)" },
      ]}
    />
  );
}
