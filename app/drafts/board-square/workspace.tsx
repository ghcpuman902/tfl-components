"use client"

import { useEffect } from "react"
import { BoardSquareArrivals } from "@/components/board/board-square-arrivals"
import { BoardViewFooter } from "@/components/board/board-view-footer"
import { boardSquareGutterCss } from "@/lib/tfl/board-layout"
import { OXFORD_CIRCUS_ARRIVALS } from "@/lib/tfl/fixtures/arrivals-boards"

/**
 * Design sandbox: square + far at true 1088×1088 with Oxford Circus fixtures.
 * Not a public product surface.
 */
export const BoardSquareDraft = () => {
  useEffect(() => {
    const html = document.documentElement
    const hadSquare = html.classList.contains("board-square")
    const hadDark = html.classList.contains("dark")
    html.classList.add("board-square", "dark")
    return () => {
      if (!hadSquare) html.classList.remove("board-square")
      if (!hadDark) html.classList.remove("dark")
    }
  }, [])

  const footer = (
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
  )

  return (
    <div className="min-h-dvh bg-muted/40 p-4 md:p-6">
      <p className="mb-4 text-sm text-muted-foreground">
        Square Ordinary (3 rows) vs Far (2 rows) — same fixtures, side by side
        from md.
      </p>
      <div className="mx-auto grid w-full max-w-[2200px] gap-6 md:grid-cols-2">
        <section className="min-w-0">
          <p className="mb-2 text-sm font-medium text-foreground">
            Ordinary · 3 rows · denser, still room-readable
          </p>
          <div
            className="board-embed board-square mx-auto flex aspect-square w-full max-w-[1088px] flex-col overflow-hidden border border-border bg-background text-foreground shadow-sm dark"
            style={boardSquareGutterCss(24)}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <BoardSquareArrivals
                stopName="Oxford Circus"
                data={OXFORD_CIRCUS_ARRIVALS}
                pinFirst
                className="min-h-0 flex-1"
              />
            </div>
            {footer}
          </div>
        </section>
        <section className="min-w-0">
          <p className="mb-2 text-sm font-medium text-foreground">
            Far · 2 rows · wall-distance type
          </p>
          <div
            className="board-embed board-square mx-auto flex aspect-square w-full max-w-[1088px] flex-col overflow-hidden border border-border bg-background text-foreground shadow-sm dark"
            data-density="far"
            style={boardSquareGutterCss(24)}
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
            {footer}
          </div>
        </section>
      </div>
    </div>
  )
}
