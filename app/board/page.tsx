import type { Metadata } from "next"
import { Suspense } from "react"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"
import { BoardStagedBuilder } from "@/components/board/board-staged-builder"
import { readAttributionContext } from "@/lib/landing/assignment"
import { getBoardStationLinesIndex } from "@/lib/tfl/board-station-lines"
import {
  getBoardStationNamesIndex,
  getBoardStationSearchIndex,
} from "@/lib/tfl/board-station-names"

export const metadata: Metadata = pageMetadata(ROUTE_PAGE_META.board)

const BoardFromParams = async () => {
  const [stationLines, stationNames, stations, analyticsContext] =
    await Promise.all([
      Promise.resolve(getBoardStationLinesIndex()),
      Promise.resolve(getBoardStationNamesIndex()),
      Promise.resolve(getBoardStationSearchIndex()),
      readAttributionContext(),
    ])

  return (
    <div className="mx-auto w-full max-w-7xl">
      <article className="space-y-5">
        <header className="text-center">
          <h1 className="tfl-title text-3xl text-foreground">Board</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Arrivals and line status for a stop you choose.
          </p>
        </header>

        <BoardStagedBuilder
          stationLines={stationLines}
          stationNames={stationNames}
          stations={stations}
          analyticsContext={analyticsContext}
        />
      </article>
    </div>
  )
}

export default function BoardBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl">
          <article className="space-y-5">
            <header className="text-center">
              <h1 className="tfl-title text-3xl text-foreground">Board</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Arrivals and line status for a stop you choose.
              </p>
            </header>
          </article>
        </div>
      }
    >
      <BoardFromParams />
    </Suspense>
  )
}
