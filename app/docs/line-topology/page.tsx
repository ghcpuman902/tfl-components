import type { Metadata } from "next"
import Link from "next/link"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { getDocsEntry } from "@/lib/docs-catalog"
import type { TransitGeometryBundle } from "@/lib/tfl/geography-types"
import type { LineHopTimesSnapshot } from "@/lib/tfl/geometry/line-hop-times"
import hopTimesJson from "@/data/geography/line-hop-times.json"
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
import type { NetworkModelSnapshot } from "@/lib/tfl/network-model/from-gtfs"
import type { NetworkModelManifest } from "@/lib/tfl/network-model/line-slice"
import snapshotJson from "@/data/network-model/snapshot.json"
import manifestJson from "@/data/network-model/manifest.json"
import { TrackTopologyView } from "./track-topology-view"

const entry = getDocsEntry("line-topology")!

export const metadata: Metadata = {
  title: entry.title,
  description: entry.description,
}

const asBundle = (value: unknown): TransitGeometryBundle =>
  value as TransitGeometryBundle

const topologyViewProps = {
  variants: {
    tube: asBundle(tubeVariants),
    overground: asBundle(overgroundVariants),
    elizabeth: asBundle(elizabethVariants),
    dlr: asBundle(dlrVariants),
    tram: asBundle(tramVariants),
  },
  centreline: {
    tube: asBundle(tubeCentre),
    overground: asBundle(overgroundCentre),
    elizabeth: asBundle(elizabethCentre),
    dlr: asBundle(dlrCentre),
    tram: asBundle(tramCentre),
  },
  dual: {
    tube: asBundle(tubeDual),
    overground: asBundle(overgroundDual),
    elizabeth: asBundle(elizabethDual),
    dlr: asBundle(dlrDual),
    tram: asBundle(tramDual),
  },
  networkModel: snapshotJson as NetworkModelSnapshot,
  networkManifest: manifestJson as NetworkModelManifest,
  hopTimes: (hopTimesJson as LineHopTimesSnapshot).lines,
}

export default function DocsLineTopologyPage() {
  return (
    <article className="mx-auto w-full max-w-[96rem] space-y-8">
      <DocsPageHeader entry={entry} />
      <TrackTopologyView {...topologyViewProps} />
      <p className="max-w-prose text-sm text-muted-foreground">
        A timetable is not required to draw the four maps. Records live on{" "}
        <Link href="/docs/data-model" className="underline underline-offset-2">
          Data model
        </Link>
        .{" "}
        <Link
          href="/docs/line-topology/junctions"
          className="underline underline-offset-2"
        >
          Junction windows
        </Link>{" "}
        crop one place at a time.
      </p>
    </article>
  )
}
