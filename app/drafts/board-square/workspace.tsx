"use client"

import { BoardSquareArrivals } from "@/components/board/board-square-arrivals"
import { BoardViewFooter } from "@/components/board/board-view-footer"
import { boardSquareGutterCss } from "@/lib/tfl/board-layout"
import { OXFORD_CIRCUS_ARRIVALS } from "@/lib/tfl/fixtures/arrivals-boards"

/**
 * Design sandbox: square + far at true 1088×1088 with Oxford Circus fixtures.
 * Not a public product surface.
 */
export const BoardSquareDraft = () => {
  return (
    <div className="min-h-dvh bg-muted/40 p-4 md:p-8">
      <p className="mb-4 text-sm text-muted-foreground">
        Square Board draft — Oxford Circus fixtures, Far density (2 rows).
      </p>
      <div
        className="board-embed board-square mx-auto flex flex-col overflow-hidden border border-border bg-background text-foreground shadow-sm"
        data-density="far"
        style={{
          width: 1088,
          height: 1088,
          maxWidth: "100%",
          ...boardSquareGutterCss(28),
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <BoardSquareArrivals
            stopName="Oxford Circus"
            data={OXFORD_CIRCUS_ARRIVALS}
            densityFar
            pinFirst
            className="min-h-0 flex-1"
          />
        </div>
        <BoardViewFooter
          compact
          sources={[
            {
              fetchedAt: 1_700_000_000_000,
              pollMs: 20_000,
              enabled: true,
              polls: false,
            },
          ]}
        />
      </div>
    </div>
  )
}
