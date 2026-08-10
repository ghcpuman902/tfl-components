import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExploreWipNotice } from "@/components/docs/explore-wip-notice";
import { SectionHub } from "@/components/docs/section-hub";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Explorer",
  description:
    "Developer-facing TfL information model — what TfL knows and how it relates.",
};

export default function ExploreIndexPage() {
  const entry = getDocsEntry("explore-index");
  if (!entry) notFound();

  return (
    <SectionHub
      entry={entry}
      banner={<ExploreWipNotice />}
      purpose="Help developers discover TfL information and how entities relate, using concepts that make sense to developers and passengers — not a list of Unified API endpoint categories. Current routes are provisional."
      comingSoon={[
        "Domains overview",
        "Stations & stops",
        "Relationship browser",
      ]}
      relatedHrefs={[
        { href: "/interfaces", label: "Data-aware — render the data" },
        { href: "/tools", label: "Tools — tune and inspect" },
      ]}
    />
  );
}
