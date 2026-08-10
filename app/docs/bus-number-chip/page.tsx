import type { Metadata } from "next";
import {
  componentDocsMetadata,
  renderComponentDocs,
} from "@/components/docs/render-component-docs";

export const generateMetadata = (): Promise<Metadata> =>
  componentDocsMetadata("bus-number-chip");

export default function BusNumberChipPage() {
  return renderComponentDocs({
    slug: "bus-number-chip",
    relatedLinks: [
      { href: "/docs/bus-arrivals", label: "Bus Arrivals" },
      { href: "/docs/platform-chip", label: "Platform chip" },
    ],
  });
}
