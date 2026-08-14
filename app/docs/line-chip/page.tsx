import type { Metadata } from "next";
import {
  componentDocsMetadata,
  renderComponentDocs,
} from "@/components/docs/render-component-docs";

export const generateMetadata = (): Promise<Metadata> =>
  componentDocsMetadata("line-chip");

export default function LineChipPage() {
  return renderComponentDocs({
    slug: "line-chip",
    relatedLinks: [
      { href: "/docs/line-title", label: "Line title" },
      { href: "/docs/colors", label: "Colours" },
      { href: "/docs/tfl-licensing", label: "TfL brand licensing" },
    ],
  });
}
