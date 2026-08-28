import type { Metadata } from "next"
import Link from "next/link"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { WipNotice } from "@/components/docs/wip-notice"
import {
  NetworkRings,
  type NetworkRingLine,
} from "@/components/labs/network-rings"
import stationGeography from "@/data/geography/all-stations.json"
import networkSnapshot from "@/data/network-model/snapshot.json"
import { getDocsEntry } from "@/lib/docs-catalog"
import type { NetworkModelSnapshot } from "@/lib/tfl/network-model"
import { resolveDiagramLineCssColor } from "@/lib/tfl/route-track"
import { docsEntryMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = docsEntryMetadata("network-rings")

type StationFeature = {
  properties: {
    lineIds: string[]
  }
}

type StationFeatureCollection = {
  features: StationFeature[]
}

const buildRingLines = (): NetworkRingLine[] => {
  const snapshot = networkSnapshot as NetworkModelSnapshot
  const geography = stationGeography as StationFeatureCollection
  const stationCountByLine = new Map<string, number>()

  for (const feature of geography.features) {
    for (const lineId of feature.properties.lineIds) {
      stationCountByLine.set(lineId, (stationCountByLine.get(lineId) ?? 0) + 1)
    }
  }

  return snapshot.lines.flatMap((line) => {
    const stationCount = stationCountByLine.get(line.id) ?? 0
    if (stationCount === 0) return []
    return [
      {
        id: line.id,
        name: line.shortName,
        mode: line.mode,
        colour: resolveDiagramLineCssColor(line.id) ?? line.color,
        stationCount,
      },
    ]
  })
}

export default function NetworkRingsPage() {
  const entry = getDocsEntry("network-rings")!
  const lines = buildRingLines()

  return (
    <div className="w-full min-w-0 space-y-8">
      <DocsReadableWidth>
        <DocsPageHeader
          entry={entry}
          notice={
            <WipNotice className="mt-4">
              This is an artwork made from network data, not a route map.
            </WipNotice>
          }
        />
      </DocsReadableWidth>

      <div className="mx-auto w-full max-w-6xl">
        <NetworkRings lines={lines} />
      </div>

      <DocsReadableWidth>
        <section
          className="space-y-2 border-t border-border pt-8"
          aria-labelledby="rings-reading"
        >
          <h2 id="rings-reading" className="tfl-title text-xl">
            Reading the rings
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Each ring is one line and each dot is a station served by that line.
            An interchange appears on every line that serves it. Station
            membership comes from the project&apos;s current network data;
            source terms are listed under{" "}
            <Link
              href="/credits"
              className="text-primary underline-offset-4 hover:underline"
            >
              Data and credits
            </Link>
            .
          </p>
        </section>
      </DocsReadableWidth>
    </div>
  )
}
