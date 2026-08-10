import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionPlaceholder } from "@/components/docs/section-placeholder";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Foundations",
  description:
    "Shared TfL visual language — colours, typography, identity, licensing.",
};

export default function FoundationsIndexPage() {
  const entry = getDocsEntry("foundations-index");
  if (!entry) notFound();

  return (
    <SectionPlaceholder
      entry={entry}
      purpose="Shared visual language and licensing guidance consumed by primitives, interfaces, maps, and tools. Safe defaults where TfL branding requires permission."
      futureSlots={[
        "Colours & badges",
        "Typography",
        "Roundel & trademarks",
        "Icons / pictograms",
        "Licensing",
      ]}
      relatedHrefs={[
        { href: "/primitives", label: "Primitives" },
        { href: "/interfaces", label: "Interfaces" },
      ]}
    />
  );
}
