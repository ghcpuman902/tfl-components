import type { Metadata } from "next";
import {
  componentDocsMetadata,
  renderComponentDocs,
} from "@/components/docs/render-component-docs";
import { WipNotice } from "@/components/docs/wip-notice";

export const generateMetadata = (): Promise<Metadata> =>
  componentDocsMetadata("branch-strip");

export default function BranchStripDocsPage() {
  return renderComponentDocs({
    slug: "branch-strip",
    relatedLinks: [
      { href: "/docs/line-strip", label: "Simple line strip" },
      { href: "/docs/station-name-labels", label: "Station name labels" },
      { href: "/tools/typography", label: "Station typography tool" },
    ],
    notice: (
      <WipNotice className="mt-3">
        Work in progress. More refinement is coming.
      </WipNotice>
    ),
  });
}
