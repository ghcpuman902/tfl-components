import type { Metadata } from "next";
import {
  componentDocsMetadata,
  renderComponentDocs,
} from "@/components/docs/render-component-docs";

export const generateMetadata = (): Promise<Metadata> =>
  componentDocsMetadata("branch-strip");

export default function BranchStripDocsPage() {
  return renderComponentDocs({
    slug: "branch-strip",
    relatedLinks: [
      { href: "/docs/line-strip", label: "Simple Line strip" },
      { href: "/docs/station-name-labels", label: "Station name labels" },
      { href: "/tools/typography", label: "Station typography tool" },
    ],
  });
}
