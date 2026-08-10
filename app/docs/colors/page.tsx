import type { Metadata } from "next";
import {
  componentDocsMetadata,
  renderComponentDocs,
} from "@/components/docs/render-component-docs";

export const generateMetadata = (): Promise<Metadata> =>
  componentDocsMetadata("line-badge");

export default function DocsColorsPage() {
  return renderComponentDocs({
    slug: "line-badge",
    relatedLinks: [
      { href: "/docs/tfl-licensing", label: "TfL brand licensing" },
      { href: "/docs/tfl-roundel", label: "Roundel" },
    ],
  });
}
