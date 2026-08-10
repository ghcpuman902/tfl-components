import type { Metadata } from "next";
import {
  componentDocsMetadata,
  renderComponentDocs,
} from "@/components/docs/render-component-docs";

export const generateMetadata = (): Promise<Metadata> =>
  componentDocsMetadata("tube-rail-status");

export default function TubeRailStatusPage() {
  return renderComponentDocs({
    slug: "tube-rail-status",
    relatedLinks: [
      { href: "/docs/colors", label: "Colours" },
      { href: "/docs/tfl-roundel", label: "Roundel" },
      { href: "/blocks/week-ahead", label: "Week ahead Block" },
      { href: "/explore/lines", label: "Browse lines" },
    ],
  });
}
