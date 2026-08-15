import type { Metadata } from "next"
import { BoardBuilder } from "@/components/board/board-builder"
import { BoardWipNotice } from "@/components/board/board-wip-notice"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { getBoardStationLinesIndex } from "@/lib/tfl/board-station-lines"
import { getBoardStationNamesIndex } from "@/lib/tfl/board-station-names"

export const metadata: Metadata = {
  title: "Board",
  description:
    "An experimental full-screen TfL display configured through one URL.",
}

export default function BoardBuilderPage() {
  const stationLines = getBoardStationLinesIndex()
  const stationNames = getBoardStationNamesIndex()

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <header>
          <h1 className="tfl-title text-3xl text-foreground">Board</h1>
          <p className="mt-2 max-w-prose text-lg text-muted-foreground">
            Configure an experimental full-screen TfL display through one URL.
          </p>
          <BoardWipNotice />
        </header>

        <BoardBuilder stationLines={stationLines} stationNames={stationNames} />
      </article>
    </DocsReadableWidth>
  )
}
