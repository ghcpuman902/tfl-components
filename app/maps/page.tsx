import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionPlaceholder } from "@/components/docs/section-placeholder";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Maps",
  description:
    "Geographic and schematic/network maps — two distinct concepts.",
};

export default function MapsIndexPage() {
  const entry = getDocsEntry("maps-index");
  if (!entry) notFound();

  return (
    <SectionPlaceholder
      entry={entry}
      purpose="First-class mapping surface. Geographic maps use real coordinates; schematic/network maps represent topology. Do not blur them into one vague Map concept."
      futureSlots={["Geographic maps", "Schematic & network maps"]}
      relatedHrefs={[
        { href: "/maps/geographic", label: "Geographic maps" },
        { href: "/maps/schematic", label: "Schematic & network" },
        { href: "/primitives", label: "Primitives (diagram atoms)" },
      ]}
    />
  );
}
