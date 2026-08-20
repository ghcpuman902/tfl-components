import type { Metadata } from "next"
import {
  ComingSoonDocsPage,
  comingSoonMetadata,
} from "@/components/docs/coming-soon-docs-page"

export const metadata: Metadata = comingSoonMetadata("map-tubemap")

export default function MapTubeMapPage() {
  return <ComingSoonDocsPage slug="map-tubemap" />
}
