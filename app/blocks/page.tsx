import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionPlaceholder } from "@/components/docs/section-placeholder";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Blocks",
  description:
    "Composed mini-apps — like shadcn Blocks — showing how Interfaces and Primitives merge.",
};

export default function BlocksIndexPage() {
  const entry = getDocsEntry("blocks-index");
  if (!entry) notFound();

  return (
    <SectionPlaceholder
      entry={entry}
      purpose="Blocks are composition pages outside the reusable component catalog. They demonstrate how data-aware Interfaces and rendering Primitives combine into a useful mini-app (similar to shadcn Blocks)."
      futureSlots={[]}
      relatedHrefs={[
        { href: "/blocks/week-ahead", label: "Week ahead" },
        { href: "/interfaces", label: "Interfaces" },
        { href: "/primitives", label: "Primitives" },
      ]}
    />
  );
}
