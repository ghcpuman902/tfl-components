import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { NationalRailPictogram } from "@/components/tfl/national-rail-pictogram"
import { getDocsEntry } from "@/lib/docs-catalog"

export const metadata: Metadata = {
  title: "Icons & pictograms",
  description:
    "Mode pictograms and diagram markers — what ships safely vs protected marks.",
}

export default function FoundationsIconsPage() {
  const entry = getDocsEntry("icons")
  if (!entry) notFound()

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry} />

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Purpose</h2>
          <p className="max-w-prose text-muted-foreground">
            Diagram markers (ticks, interchange rings) and connection pictograms
            used by strips and maps. Protected TfL mode roundels remain
            env-gated — see the{" "}
            <Link
              href="/docs/tfl-roundel"
              className="text-primary underline-offset-4 hover:underline"
            >
              Roundel
            </Link>{" "}
            page.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Safe examples</h2>
          <div className="flex flex-wrap items-end gap-6 rounded-lg border border-border p-4">
            <div className="space-y-1 text-center">
              <NationalRailPictogram height="2rem" />
              <p className="text-xs text-muted-foreground">National Rail</p>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              NR pictogram ships for interchange labelling. Do not treat it as
              permission to use other protected TfL marks.
            </p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Do / don’t</h2>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            <li>Do use diagram geometry helpers for ticks and rings.</li>
            <li>Do gate the Roundel behind explicit brand permission.</li>
            <li>
              Don’t imply installing components grants TfL trademark rights.
            </li>
          </ul>
        </section>

        <p className="text-sm text-muted-foreground">
          Brand constraints:{" "}
          <Link
            href="/docs/tfl-licensing"
            className="text-primary underline-offset-4 hover:underline"
          >
            Licensing & brand use
          </Link>
          .
        </p>
      </article>
    </DocsReadableWidth>
  )
}
