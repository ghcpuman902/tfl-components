import type { Metadata } from "next";
import {
  componentDocsMetadata,
  renderComponentDocs,
} from "@/components/docs/render-component-docs";

export const generateMetadata = (): Promise<Metadata> =>
  componentDocsMetadata("line-badge");

export default function DocsLineBadgePage() {
  return renderComponentDocs({
    slug: "line-badge",
    relatedLinks: [
      { href: "/docs/colors", label: "Colours" },
      { href: "/docs/tfl-licensing", label: "TfL brand licensing" },
    ],
  });
}
