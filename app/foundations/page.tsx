import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHub } from "@/components/docs/section-hub";
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
    <SectionHub
      entry={entry}
      purpose="Shared visual language and licensing guidance consumed by primitives, interfaces, maps, and tools. Safe defaults where TfL branding requires permission."
      relatedHrefs={[
        { href: "/primitives", label: "Rendering primitives" },
        { href: "/interfaces", label: "Data-aware components" },
        { href: "/foundations/licensing", label: "Licensing & brand use" },
      ]}
    />
  );
}
