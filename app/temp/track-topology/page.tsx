import type { Metadata } from "next"
import Link from "next/link"
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
import { TrackTopologyView } from "./track-topology-view"

export const metadata: Metadata = {
  title: "Line topology source models (temp)",
  description:
    "Compare passenger topology, physical track, and route-pattern evidence.",
}

const asBundle = (value: unknown): TransitGeometryBundle =>
  value as TransitGeometryBundle

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
          track and geographic paths. Pattern records show where the sources
          agree and what each one omits.
        </p>
        <p className="text-sm">
          <Link
            href="/temp/track-topology/junctions"
            className="underline underline-offset-2"
          >
            Junction grammar reference table →
          </Link>
        </p>
      </header>
      <TrackTopologyView
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
    </div>
  )
}
