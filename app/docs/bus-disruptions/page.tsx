import type { Metadata } from "next"
import {
  ComingSoonDocsPage,
  comingSoonMetadata,
} from "@/components/docs/coming-soon-docs-page"

export const metadata: Metadata = comingSoonMetadata("bus-disruptions")

export default function BusDisruptionsPage() {
  return <ComingSoonDocsPage slug="bus-disruptions" />
}
