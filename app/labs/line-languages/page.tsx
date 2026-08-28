import type { Metadata } from "next"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { RelationshipBadges } from "@/components/docs/relationship-badges"
import { WipNotice } from "@/components/docs/wip-notice"
import { LineLanguages } from "@/components/labs/line-languages"
import { getDocsEntry } from "@/lib/docs-catalog"
import { docsEntryMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = docsEntryMetadata("line-languages")

export default function LineLanguagesPage() {
  const entry = getDocsEntry("line-languages")!

  return (
    <div className="w-full min-w-0 space-y-8">
      <DocsReadableWidth>
        <DocsPageHeader
          entry={entry}
          notice={
            <WipNotice className="mt-4">
              The Japanese names are phonetic working labels, not official TfL
              translations.
            </WipNotice>
          }
        />
      </DocsReadableWidth>

      <div className="mx-auto w-full max-w-7xl">
        <LineLanguages />
      </div>

      <DocsReadableWidth>
        <div className="space-y-6 border-t border-border pt-8">
          <section className="space-y-2" aria-labelledby="language-findings">
            <h2 id="language-findings" className="tfl-title text-xl">
              What changes with the language
            </h2>
            <p className="max-w-prose text-muted-foreground">
              New names change line breaks, text width, and font fallback. A
              production component also needs language metadata so assistive
              technology can pronounce each label correctly.
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
