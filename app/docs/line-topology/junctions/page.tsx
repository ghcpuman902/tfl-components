import type { Metadata } from "next"
import Link from "next/link"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { getDocsEntry } from "@/lib/docs-catalog"
import { docsEntryMetadata } from "@/lib/site-metadata"
import type { TransitGeometryBundle } from "@/lib/tfl/geography-types"
import tubeCentre from "@/data/geography/unique-track/tube/full.json"
import overgroundCentre from "@/data/geography/unique-track/overground/full.json"
import elizabethCentre from "@/data/geography/unique-track/elizabeth/full.json"
import dlrCentre from "@/data/geography/unique-track/dlr/full.json"
import tramCentre from "@/data/geography/unique-track/tram/full.json"
import tubeDual from "@/data/geography/unique-track/tube/dual-full.json"
import overgroundDual from "@/data/geography/unique-track/overground/dual-full.json"
import elizabethDual from "@/data/geography/unique-track/elizabeth/dual-full.json"
import dlrDual from "@/data/geography/unique-track/dlr/dual-full.json"
import tramDual from "@/data/geography/unique-track/tram/dual-full.json"
import tubeVariants from "@/data/geography/tube-geometry.json"
import overgroundVariants from "@/data/geography/overground-geometry.json"
import elizabethVariants from "@/data/geography/elizabeth-geometry.json"
import dlrVariants from "@/data/geography/dlr-geometry.json"
import tramVariants from "@/data/geography/tram-geometry.json"
import { JunctionCasesView } from "../junction-cases-view"

const entry = getDocsEntry("line-topology-junctions")!

export const metadata: Metadata = docsEntryMetadata("line-topology-junctions")

const asBundle = (value: unknown): TransitGeometryBundle =>
  value as TransitGeometryBundle

export default function DocsJunctionWindowsPage() {
  return (
    <article className="mx-auto w-full max-w-[96rem] space-y-8">
      <DocsPageHeader entry={entry} />
      <p className="text-sm text-muted-foreground">
        <Link
          href="/docs/line-topology"
          className="underline underline-offset-2"
        >
          Line topology
        </Link>
      </p>
      <JunctionCasesView
        variants={{
          tube: asBundle(tubeVariants),
          overground: asBundle(overgroundVariants),
          elizabeth: asBundle(elizabethVariants),
          dlr: asBundle(dlrVariants),
          tram: asBundle(tramVariants),
        }}
        centreline={{
          tube: asBundle(tubeCentre),
          overground: asBundle(overgroundCentre),
          elizabeth: asBundle(elizabethCentre),
          dlr: asBundle(dlrCentre),
          tram: asBundle(tramCentre),
        }}
        dual={{
          tube: asBundle(tubeDual),
          overground: asBundle(overgroundDual),
          elizabeth: asBundle(elizabethDual),
          dlr: asBundle(dlrDual),
          tram: asBundle(tramDual),
        }}
      />
    </article>
  )
}
