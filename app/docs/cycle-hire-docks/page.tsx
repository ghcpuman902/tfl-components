import type { Metadata } from "next";
import {
  componentDocsMetadata,
  renderComponentDocs,
} from "@/components/docs/render-component-docs";

export const generateMetadata = (): Promise<Metadata> =>
  componentDocsMetadata("cycle-hire-docks");

export default function CycleHireDocksPage() {
  return renderComponentDocs({
    slug: "cycle-hire-docks",
    relatedLinks: [
      { href: "/docs/colors", label: "Colours" },
      { href: "/docs/tfl-roundel", label: "Roundel" },
      { href: "/docs/map-geographic", label: "Map (Geographic)" },
      { href: "/docs/components", label: "All components" },
    ],
  });
}
