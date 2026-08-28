import type { Metadata } from "next"
import { BranchAtlas } from "@/components/labs/branch-atlas"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { RelationshipBadges } from "@/components/docs/relationship-badges"
import { WipNotice } from "@/components/docs/wip-notice"
import { getDocsEntry } from "@/lib/docs-catalog"
import { docsEntryMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = docsEntryMetadata("branch-atlas")

export default function BranchAtlasPage() {
  const entry = getDocsEntry("branch-atlas")!

  return (
    <div className="w-full min-w-0 space-y-8">
      <DocsReadableWidth>
        <DocsPageHeader
          entry={entry}
          notice={
            <WipNotice className="mt-4">
              Some branches still need hand tuning. Awkward results belong in
              this atlas too.
            </WipNotice>
          }
        />
      </DocsReadableWidth>

      <div className="mx-auto w-full max-w-7xl">
        <BranchAtlas />
      </div>

      <DocsReadableWidth>
        <div className="space-y-6 border-t border-border pt-8">
          <section className="space-y-2" aria-labelledby="branch-reading">
            <h2 id="branch-reading" className="tfl-title text-xl">
              Reading the atlas
            </h2>
            <p className="max-w-prose text-muted-foreground">
              A station may need more than one drawn node where paths diverge
              and meet again. Horizontal and vertical diagrams use separate
              layouts, since rotating one rarely leaves readable labels.
            </p>
          </section>
          <RelationshipBadges
            builtWith={entry.builtWith}
            usesFoundations={entry.usesFoundations}
          />
        </div>
      </DocsReadableWidth>
    </div>
  )
}
