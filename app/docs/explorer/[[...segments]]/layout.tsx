import type { ReactNode } from "react"
import { Suspense } from "react"
import { ExplorerShell } from "@/components/explorer/explorer-shell"
import { ExploreBodySkeleton } from "@/components/tfl/page-skeletons"
import { parseExplorerPath } from "@/lib/tfl/explorer-url-state"

type ExplorerSegmentLayoutProps = {
  children: ReactNode
  params: Promise<{ segments?: string[] }>
}

export default function DocsExplorerSegmentLayout({
  children,
  params,
}: ExplorerSegmentLayoutProps) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<ExploreBodySkeleton />}>
        <ExplorerChromeFromParams params={params} />
      </Suspense>
      {children}
    </div>
  )
}

async function ExplorerChromeFromParams({
  params,
}: Pick<ExplorerSegmentLayoutProps, "params">) {
  const { segments } = await params
  const state = parseExplorerPath(segments ?? [])

  return <ExplorerShell state={state} />
}
