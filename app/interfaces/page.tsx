import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionPlaceholder } from "@/components/docs/section-placeholder";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Interfaces",
  description:
    "Data-aware TfL components — get normalised data and render useful transport UI.",
};

export default function InterfacesIndexPage() {
  const entry = getDocsEntry("interfaces-index");
  if (!entry) notFound();

  return (
    <SectionPlaceholder
      entry={entry}
      purpose="Embeddable, data-aware components organised by developer intent (status, arrivals, journeys, routes). Highest-value path: get data → render."
      futureSlots={[
        "Status & disruptions",
        "Arrivals & departures",
        "Journeys",
        "Routes & sequences",
        "Service information",
      ]}
      relatedHrefs={[
        { href: "/primitives", label: "Primitives — lower-level control" },
        { href: "/foundations", label: "Foundations — brand and colour" },
        { href: "/explore", label: "Explore — understand the data" },
      ]}
    />
  );
}
