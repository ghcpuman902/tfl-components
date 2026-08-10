import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHub } from "@/components/docs/section-hub";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Blocks",
  description:
    "Composed mini-apps — like shadcn Blocks — showing how data-aware components and primitives merge.",
};

export default function BlocksIndexPage() {
  const entry = getDocsEntry("blocks-index");
  if (!entry) notFound();

  return (
    <SectionHub
      entry={entry}
      purpose="Blocks are composition pages outside the reusable component catalog. They demonstrate how data-aware components and rendering primitives combine into a useful mini-app (similar to shadcn Blocks). A Block is not a single installable component API."
      relatedHrefs={[
        { href: "/docs/components", label: "Components catalogue" },
        { href: "/docs/map-schematic", label: "Schematic maps" },
        { href: "/blocks/week-ahead", label: "Week ahead" },
      ]}
    />
  );
}
