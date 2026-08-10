import type { Metadata } from "next";
import {
  ComingSoonDocsPage,
  comingSoonMetadata,
} from "@/components/docs/coming-soon-docs-page";

export const metadata: Metadata = comingSoonMetadata("river-bus-arrivals");

export default function RiverBusArrivalsPage() {
  return <ComingSoonDocsPage slug="river-bus-arrivals" />;
}
