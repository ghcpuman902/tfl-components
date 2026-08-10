import type { Metadata } from "next";
import {
  componentDocsMetadata,
  renderComponentDocs,
} from "@/components/docs/render-component-docs";

export const generateMetadata = (): Promise<Metadata> =>
  componentDocsMetadata("tube-rail-arrivals");

export default function TubeRailArrivalsPage() {
  return renderComponentDocs({
    slug: "tube-rail-arrivals",
    relatedLinks: [
      { href: "/docs/bus-arrivals", label: "Bus Arrivals" },
      { href: "/docs/colors", label: "Colours" },
      { href: "/explore/routes", label: "Route stations" },
    ],
  });
}
