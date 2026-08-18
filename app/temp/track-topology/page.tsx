import type { Metadata } from "next"
import Link from "next/link"
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

export const metadata: Metadata = {
  title: "Line topology source models (temp)",
  description:
    "Compare TfL sequences, OSM track, and the derived timetable snapshot.",
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

export default function TrackTopologyTempPage() {
  return (
    <div className="mx-auto max-w-[96rem] space-y-6 px-4 py-10">
      <header className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Temp research, not linked in nav
        </p>
        <h1 className="text-2xl font-semibold">Line topology source models</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          TfL sequences describe passenger movement. OSM describes physical
          track. The timetable snapshot adds collapsed Aubin patterns,
          typical calendars, headways, and low-resolution Elizabeth /
          Overground shapes.
        </p>
        <p className="text-sm">
          <Link
            href="/temp/track-topology/junctions"
            className="underline underline-offset-2"
          >
            Real junction windows →
          </Link>
        </p>
      </header>
      <TrackTopologyView {...topologyViewProps} />
    </div>
  )
}
