import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { getDocsEntry } from "@/lib/docs-catalog"

export const metadata: Metadata = {
  title: "Licensing & brand use",
  description:
    "What installing a component does and does not grant for TfL brand assets.",
}

export default function FoundationsLicensingPage() {
  const entry = getDocsEntry("licensing")
  if (!entry) notFound()

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry} />

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Purpose</h2>
          <p className="max-w-prose text-muted-foreground">
            Clear separation between what this library ships and what requires
            separate TfL permission. Installing a registry item does{" "}
            <strong className="font-medium text-foreground">not</strong> grant
            rights to protected TfL assets.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Four distinctions</h2>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="font-medium text-foreground">
                Official line colours
              </dt>
              <dd className="text-muted-foreground">
                Used for accurate line identity via{" "}
                <Link
                  href="/docs/colors"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Line colours & badges
                </Link>{" "}
                / <code className="text-xs">tfl-ts</code> colour helpers.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                Protected TfL marks
              </dt>
              <dd className="text-muted-foreground">
                Roundel and related trademarks — env-gated; see{" "}
                <Link
                  href="/docs/tfl-roundel"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Roundel
                </Link>
                .
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                Licensed TfL typefaces
              </dt>
              <dd className="text-muted-foreground">
                Johnston / TfL Go require a font licence. Demos use Hammersmith
                One. See{" "}
                <Link
                  href="/docs/typography"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Typography
                </Link>
                .
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                Safe defaults & alternatives
              </dt>
              <dd className="text-muted-foreground">
                Open fonts, gated Roundel, and colour utilities that do not
                imply brand endorsement.
              </dd>
            </div>
          </dl>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Do / don’t</h2>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            <li>Do attribute geographic basemap data where required.</li>
            <li>
              Do keep credentials and brand toggles in the application layer.
            </li>
            <li>
              Don’t redistribute Johnston or Roundel artwork without permission.
            </li>
          </ul>
        </section>
      </article>
    </DocsReadableWidth>
  )
}
