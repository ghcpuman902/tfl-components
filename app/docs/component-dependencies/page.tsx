import type { Metadata } from "next"
import { connection } from "next/server"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import {
  componentGraphBuildCommand,
  readComponentGraphSnapshot,
} from "@/lib/dev/component-graph/read-graph"
import { getDocsEntry } from "@/lib/docs-catalog"
import { pageMetadata } from "@/lib/site-metadata"
import { ComponentGraphView } from "./graph-view"

export const metadata: Metadata = pageMetadata({
  title: "Component dependencies",
  description:
    "Development map of reusable TfL component modules, their imports, and data contracts.",
  path: "/docs/component-dependencies",
  robots: { index: false, follow: false },
})

const ROOT = process.cwd()

async function GraphSection() {
  await connection()
  const snapshot = readComponentGraphSnapshot(ROOT)
  if (!snapshot) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Graph snapshot missing</p>
        <p className="mt-2">
          Generate the dependency map locally, then reload this page:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground">
          <code>{componentGraphBuildCommand}</code>
        </pre>
      </div>
    )
  }

  return <ComponentGraphView snapshot={snapshot} />
}

export default function ComponentDependenciesPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound()
  }

  const entry = getDocsEntry("component-dependencies")
  if (!entry) notFound()

  return (
    <article className="mx-auto w-full max-w-6xl space-y-8">
      <DocsPageHeader entry={entry} />
      <div className="docs-mdx space-y-3 text-sm text-muted-foreground">
        <p>
          Reusable TfL library modules under{" "}
          <code className="text-xs">registry/tfl</code> and{" "}
          <code className="text-xs">components/tfl</code>. Arrows run from
          importer to dependency. Orphans are expected while drafts and legacy
          surfaces remain unmerged.
        </p>
        <p>
          Node fill shows stateful vs stateless behaviour. A blue ring marks
          exported props that expect normalised{" "}
          <code className="text-xs">tfl-ts</code> data — not helpers that only
          call <code className="text-xs">tfl-ts</code> internally.
        </p>
      </div>
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading graph…</p>
        }
      >
        <GraphSection />
      </Suspense>
    </article>
  )
}
