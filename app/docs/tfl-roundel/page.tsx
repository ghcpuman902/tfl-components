import type { Metadata } from "next"
import {
  componentDocsMetadata,
  renderComponentDocs,
} from "@/components/docs/render-component-docs"

export const generateMetadata = (): Promise<Metadata> =>
  componentDocsMetadata("tfl-roundel")

export default function DocsRoundelPage() {
  return renderComponentDocs({
    slug: "tfl-roundel",
    relatedLinks: [
      { href: "/docs/tfl-licensing", label: "TfL brand licensing" },
      { href: "/docs/colors", label: "Colours" },
    ],
  })
}
