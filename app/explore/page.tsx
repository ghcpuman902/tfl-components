import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionPlaceholder } from "@/components/docs/section-placeholder";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Explore",
  description:
    "Developer-facing TfL information model — what TfL knows and how it relates.",
};

export default function ExploreIndexPage() {
  const entry = getDocsEntry("explore-index");
  if (!entry) notFound();

  return (
    <SectionPlaceholder
      entry={entry}
      purpose="Help developers discover TfL information and how entities relate, using concepts that make sense to developers and passengers — not a list of Unified API endpoint categories."
      futureSlots={[
        "Domains overview",
        "Lines & routes",
        "Stations & stops",
        "Status & disruptions (as data)",
        "Arrivals (as data)",
        "Relationship browser",
      ]}
      relatedHrefs={[
        { href: "/interfaces", label: "Interfaces — render the data" },
        { href: "/tools", label: "Tools — tune and inspect" },
      ]}
    />
  );
}
