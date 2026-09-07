import type { Metadata } from "next"
import { Suspense } from "react"
import { catalogExplorerModels } from "@/lib/tfl/investigate/candidates/catalog"
import { JunctionCandidateExplorer } from "./explorer"

export const metadata: Metadata = {
  title: "Draft: Junction candidates",
  description:
    "Inspect every distinct minimal decomposition of a junction and the movement matrix that tree reconstructs.",
  robots: { index: false, follow: false },
}

const ExplorerBody = () => {
  const models = catalogExplorerModels()
  return <JunctionCandidateExplorer models={models} />
}

export default function JunctionCandidatesDraftPage() {
  return (
    <article className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">Draft</p>
        <h1 className="text-3xl font-medium text-foreground">Junction candidates</h1>
        <p className="max-w-prose text-muted-foreground">
          Every distinct minimal degree-≤3 tree for a junction, with the
          movement matrix reconstructed from that tree. This page does not
          choose a layout.
        </p>
        <p className="max-w-prose text-sm text-muted-foreground">
          TfL ordered service sequences → source movement matrix → candidate
          tree → reconstructed movement matrix → exact comparison.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Enumerating candidates…</p>}>
        <ExplorerBody />
      </Suspense>
    </article>
  )
}
