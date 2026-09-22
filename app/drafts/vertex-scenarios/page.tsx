import type { Metadata } from "next"
import { Suspense } from "react"
import { catalogVertexScenarios } from "@/lib/tfl/investigate/vertex-scenarios"
import { workbenchCases } from "@/lib/tfl/investigate/vertex-scenarios/case-discovery"
import { VertexScenarioWorkspace } from "./workbench"

export const metadata: Metadata = {
  title: "Draft: Vertex scenarios",
  description: "A station's permission matrix, drawn as a line.",
  robots: { index: false, follow: false },
}

type DraftPageProps = { searchParams: Promise<{ case?: string | string[] }> }

const CatalogueBody = async ({ searchParams }: DraftPageProps) => {
  const query = await searchParams
  const scenarios = catalogVertexScenarios()
  return (
    <VertexScenarioWorkspace
      scenarios={scenarios}
      cases={workbenchCases()}
      initialCase={typeof query.case === "string" ? query.case : undefined}
    />
  )
}

export default function VertexScenariosDraftPage({
  searchParams,
}: DraftPageProps) {
  return (
    <article className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-3 border-b border-border pb-8">
        <p className="text-sm text-muted-foreground">
          Drawing the line / Working draft
        </p>
        <h1 className="text-3xl font-medium text-foreground">
          Vertex scenarios
        </h1>
        <p className="max-w-prose text-muted-foreground">
          Draw a station from the movements it allows.
        </p>
      </header>
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Building figures…</p>
        }
      >
        <CatalogueBody searchParams={searchParams} />
      </Suspense>
    </article>
  )
}
