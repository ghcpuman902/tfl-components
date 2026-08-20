import type { Metadata } from "next"
import {
  componentDocsMetadata,
  renderComponentDocs,
} from "@/components/docs/render-component-docs"
import { WipNotice } from "@/components/docs/wip-notice"

export const generateMetadata = (): Promise<Metadata> =>
  componentDocsMetadata("branch-strip-horizontal")

export default function BranchStripHorizontalDocsPage() {
  return renderComponentDocs({
    slug: "branch-strip-horizontal",
    relatedLinks: [
      { href: "/docs/branch-strip-vertical", label: "Branch strip — vertical" },
      { href: "/docs/line-strip", label: "Simple line strip" },
      { href: "/docs/station-name-labels", label: "Station name labels" },
    ],
    notice: (
      <WipNotice className="mt-3">
        Work in progress. More refinement is coming.
      </WipNotice>
    ),
  })
}
