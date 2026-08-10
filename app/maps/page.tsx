import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHub } from "@/components/docs/section-hub";
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
    <SectionHub
      entry={entry}
      purpose="First-class mapping surface. Geographic maps use real coordinates; schematic/network maps represent topology. Do not blur them into one vague Map concept."
      relatedHrefs={[
        { href: "/primitives", label: "Primitives (diagram atoms)" },
        { href: "/blocks/week-ahead", label: "Week ahead block" },
      ]}
    />
  );
}
