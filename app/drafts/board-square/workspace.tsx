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

  return (
    <div className="flex min-h-dvh flex-col items-center gap-10 bg-muted/40 p-4 md:p-8">
      <section className="w-full max-w-[1088px]">
        <p className="mb-3 text-sm text-muted-foreground">
          Far · 2 rows · 1088×1088 · Oxford Circus fixtures
        </p>
        <div
          className="board-embed board-square mx-auto flex flex-col overflow-hidden border border-border bg-background text-foreground shadow-sm dark"
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
      </section>
      <section className="w-full max-w-[1088px]">
        <p className="mb-3 text-sm text-muted-foreground">
          Default square · 3 rows · 1088×1088 · same fixtures
        </p>
        <div
          className="board-embed board-square mx-auto flex flex-col overflow-hidden border border-border bg-background text-foreground shadow-sm dark"
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
      </section>
    </div>
  )
}
