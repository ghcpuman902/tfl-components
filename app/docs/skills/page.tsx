import type { Metadata } from "next"
import {
  ComingSoonDocsPage,
  comingSoonMetadata,
} from "@/components/docs/coming-soon-docs-page"

export const metadata: Metadata = comingSoonMetadata("skills-for-ai")

export default function SkillsForAiPage() {
  return <ComingSoonDocsPage slug="skills-for-ai" />
}
