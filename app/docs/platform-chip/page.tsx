import type { Metadata } from "next";
import {
  componentDocsMetadata,
  renderComponentDocs,
} from "@/components/docs/render-component-docs";

export const generateMetadata = (): Promise<Metadata> =>
  componentDocsMetadata("platform-chip");

export default function PlatformChipPage() {
  return renderComponentDocs({
    slug: "platform-chip",
    relatedLinks: [
      { href: "/docs/tube-rail-arrivals", label: "Tube & Rail Arrivals" },
      { href: "/docs/bus-number-chip", label: "Bus number chip" },
      { href: "/docs/station-name-labels", label: "Station name labels" },
    ],
  });
}
