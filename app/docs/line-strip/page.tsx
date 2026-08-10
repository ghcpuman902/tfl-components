import type { Metadata } from "next";
import {
  componentDocsMetadata,
  renderComponentDocs,
} from "@/components/docs/render-component-docs";

export const generateMetadata = (): Promise<Metadata> =>
  componentDocsMetadata("line-strip");

export default function LineStripDocsPage() {
  return renderComponentDocs({
    slug: "line-strip",
    relatedLinks: [
      { href: "/docs/branch-strip", label: "Branch line strip" },
      { href: "/docs/station-name-labels", label: "Station name labels" },
      { href: "/docs/map-schematic", label: "Schematic & network" },
      { href: "/blocks/week-ahead", label: "Week ahead Block" },
    ],
  });
}
