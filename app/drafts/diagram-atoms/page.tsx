import type { Metadata } from "next"
import { DiagramAtomsWorkspace } from "./workspace"

export const metadata: Metadata = {
  title: "Draft: Diagram atoms",
  description:
    "Station marks, label boxes, and the strokes that keep them readable.",
  robots: { index: false, follow: false },
}

export default function DiagramAtomsDraftPage() {
  return (
    <article className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-3 border-b border-border pb-8">
        <p className="text-sm text-muted-foreground">
          Drawing the line / Working draft
        </p>
        <h1 className="text-3xl font-medium text-foreground">Diagram atoms</h1>
        <p className="max-w-prose text-muted-foreground">
          Station marks, label boxes, and the strokes that keep them readable.
        </p>
      </header>
      <DiagramAtomsWorkspace />
    </article>
  )
}
