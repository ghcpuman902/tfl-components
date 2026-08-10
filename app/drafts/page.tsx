import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionPlaceholder } from "@/components/docs/section-placeholder";
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
    <SectionPlaceholder
      entry={entry}
      purpose="Experimental or incomplete ideas live here without pretending to be stable public APIs. Promotion requires clear intent, a target group, documented contracts, licensing safety, and human review (see docs/product-architecture.md §12)."
      futureSlots={[
        "Incoming experiments",
        "AI-generated explorations under review",
      ]}
      relatedHrefs={[
        { href: "/tools", label: "Tools — promoted playgrounds" },
        { href: "/interfaces", label: "Interfaces — promoted components" },
      ]}
    />
  );
}
