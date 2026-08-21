import type { CSSProperties } from "react"
import type { Metadata } from "next"
import { Suspense } from "react"
import {
  ipadCaseRounding,
  iphoneCaseRounding,
} from "@/components/board/board-device-frame"
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

const BoardBuilderFallback = () => (
  <div className="mx-auto w-full max-w-7xl">
    <article className="space-y-5">
      <header className="text-center">
        <h1 className="tfl-title text-3xl text-foreground">Board</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Arrivals and line status for a stop you choose.
        </p>
      </header>
      <div
        className="mx-auto aspect-75/154 w-full max-w-[calc(min(42dvh,22rem)*75/154)] animate-pulse rounded-(--preview-rounding-narrow) bg-muted md:aspect-[125.7409/88.4773] md:w-[min(calc(min(50dvh,26rem)*125.7409/88.4773),calc(100vw-26rem))] md:max-w-none md:rounded-(--preview-rounding-wide)"
        style={
          {
            "--preview-rounding-narrow": iphoneCaseRounding,
            "--preview-rounding-wide": ipadCaseRounding,
          } as CSSProperties
        }
        aria-hidden
      />
    </article>
  </div>
)

export default function BoardBuilderPage() {
  return (
    <Suspense fallback={<BoardBuilderFallback />}>
      <BoardFromParams />
    </Suspense>
  )
}
