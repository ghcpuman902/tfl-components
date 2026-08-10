import type { Metadata } from "next";
import {
  ComingSoonDocsPage,
  comingSoonMetadata,
} from "@/components/docs/coming-soon-docs-page";

export const metadata: Metadata = comingSoonMetadata("cable-car-arrivals");

export default function CableCarArrivalsPage() {
  return <ComingSoonDocsPage slug="cable-car-arrivals" />;
}
