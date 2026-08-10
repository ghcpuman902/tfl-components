import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHub } from "@/components/docs/section-hub";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Data-aware components",
  description:
    "Data-aware TfL components — get normalised data and render useful transport UI.",
};

export default function InterfacesIndexPage() {
  const entry = getDocsEntry("interfaces-index");
  if (!entry) notFound();

  return (
    <SectionHub
      entry={entry}
      purpose="Embeddable, data-aware components organised by developer intent (status, arrivals, line diagrams). Highest-value path: get data → render. Under Components → Data-aware in the sidebar."
      comingSoon={["Journeys", "Service information"]}
      relatedHrefs={[
        { href: "/primitives", label: "Rendering primitives" },
        { href: "/foundations", label: "Foundations" },
        { href: "/explore", label: "Explorer" },
      ]}
    />
  );
}
