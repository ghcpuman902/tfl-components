import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHub } from "@/components/docs/section-hub";
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
    <SectionHub
      entry={entry}
      purpose="Blocks are composition pages outside the reusable component catalog. They demonstrate how data-aware Interfaces and rendering Primitives combine into a useful mini-app (similar to shadcn Blocks)."
      relatedHrefs={[
        { href: "/interfaces", label: "Interfaces" },
        { href: "/primitives", label: "Primitives" },
        { href: "/maps/schematic", label: "Schematic maps" },
      ]}
    />
  );
}
