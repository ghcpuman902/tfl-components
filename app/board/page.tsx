import type { Metadata } from "next"
import { BoardBuilder } from "@/components/board/board-builder"
import { BoardWipNotice } from "@/components/board/board-wip-notice"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { getBoardStationLinesIndex } from "@/lib/tfl/board-station-lines"
import {
  getBoardStationNamesIndex,
  getBoardStationSearchIndex,
} from "@/lib/tfl/board-station-names"

export const metadata: Metadata = {
  title: "Board",
  description:
    "Configure a live station display and open a bookmarkable URL.",
}

export default function BoardBuilderPage() {
  const stationLines = getBoardStationLinesIndex()
  const stationNames = getBoardStationNamesIndex()
  const stations = getBoardStationSearchIndex()

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <header>
          <h1 className="tfl-title text-3xl text-foreground">Board</h1>
          <p className="mt-2 max-w-prose text-lg text-muted-foreground">
            Search or locate, pick a layout, preview the display, then copy
            or open the URL.
          </p>
          <BoardWipNotice />
          <div className="mt-6 max-w-prose space-y-3 text-sm text-muted-foreground">
            <p>
              Unattended example:{" "}
              <code className="text-foreground">
                /board/view#stop=940GZZLUOXC&behaviour=unattended&a.rows=3&s.tiles=4
              </code>
            </p>
            <p>
              A landscape iPad can take 3 arrival rows per bound and a 4-tile
              status column. A portrait phone should keep one panel, usually
              arrivals.
            </p>
          </div>
        </header>

        <BoardBuilder
          stationLines={stationLines}
          stationNames={stationNames}
          stations={stations}
        />
      </article>
    </DocsReadableWidth>
  )
}
