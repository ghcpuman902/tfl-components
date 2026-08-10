import type { Metadata } from "next";
import {
  ComingSoonDocsPage,
  comingSoonMetadata,
} from "@/components/docs/coming-soon-docs-page";

export const metadata: Metadata = comingSoonMetadata("cycle-hire-docks");

export default function CycleHireDocksPage() {
  return <ComingSoonDocsPage slug="cycle-hire-docks" />;
}
