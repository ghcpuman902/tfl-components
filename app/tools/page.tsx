import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionPlaceholder } from "@/components/docs/section-placeholder";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Tools",
  description:
    "Developer playgrounds — inspect, test, tune, or debug. Not embeddable product UI.",
};

export default function ToolsIndexPage() {
  const entry = getDocsEntry("tools-index");
  if (!entry) notFound();

  return (
    <SectionPlaceholder
      entry={entry}
      purpose="A tool exists to inspect, test, understand, tune, generate, compare, or debug. It is not the production component API. Reject Misc dumping-ground entries; use Drafts for incubation."
      futureSlots={[
        "Typography / label labs",
        "Fixture and state inspectors",
        "Diagram tuning playgrounds",
      ]}
      relatedHrefs={[
        { href: "/drafts", label: "Drafts — not yet tools" },
        { href: "/interfaces", label: "Interfaces — embeddable UI" },
      ]}
    />
  );
}
