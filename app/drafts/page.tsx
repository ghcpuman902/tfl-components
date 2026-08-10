import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHub } from "@/components/docs/section-hub";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Drafts",
  description:
    "Incubation for experimental work until promotion criteria are met.",
};

export default function DraftsIndexPage() {
  const entry = getDocsEntry("drafts-index");
  if (!entry) notFound();

  return (
    <SectionHub
      entry={entry}
      purpose="Experimental or incomplete ideas live here without pretending to be stable public APIs. Draft pages must show maturity, intended destination, unanswered questions, and promotion requirements. Do not include Drafts in standard installation lists."
      comingSoon={[
        "Incoming experiments",
        "AI-generated explorations under review",
      ]}
      relatedHrefs={[
        { href: "/tools", label: "Tools — promoted playgrounds" },
        { href: "/interfaces", label: "Data-aware — promoted components" },
        { href: "/blocks", label: "Blocks — composed patterns" },
      ]}
    />
  );
}
