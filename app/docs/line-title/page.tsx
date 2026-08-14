import type { Metadata } from "next";
import {
  componentDocsMetadata,
  renderComponentDocs,
} from "@/components/docs/render-component-docs";

export const generateMetadata = (): Promise<Metadata> =>
  componentDocsMetadata("line-title");

export default function LineTitlePage() {
  return renderComponentDocs({
    slug: "line-title",
    relatedLinks: [
      { href: "/docs/line-chip", label: "Line chip" },
      { href: "/docs/tube-rail-status", label: "Tube & Rail Status" },
      { href: "/docs/platform-chip", label: "Platform chip" },
      { href: "/docs/station-name-labels", label: "Station name labels" },
    ],
  });
}
