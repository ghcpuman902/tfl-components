"use client"

import { BoardGlanceArrivals } from "@/components/board/board-glance-arrivals"
import { BoardViewFooter } from "@/components/board/board-view-footer"
import { boardGlanceGutterCss } from "@/lib/tfl/board-layout"
import { OXFORD_CIRCUS_ARRIVALS } from "@/lib/tfl/fixtures/arrivals-boards"

type Frame = {
  label: string
  width: number
  height: number
  pair?: boolean
  room?: boolean
  interactive?: boolean
}

const FRAMES: readonly Frame[] = [
  {
    label: "Anchor · touch · 390×844",
    width: 390,
    height: 844,
    interactive: true,
  },
  { label: "Anchor · unattended · 1366×1024", width: 1366, height: 1024 },
  { label: "Anchor · unattended · 1024×1366", width: 1024, height: 1366 },
  { label: "Pair · 390×844", width: 390, height: 844, pair: true },
  { label: "Pair · 1440×900", width: 1440, height: 900, pair: true },
  { label: "Across the room · 390×844", width: 390, height: 844, room: true },
  { label: "Across the room · 1440×900", width: 1440, height: 900, room: true },
]

/**
 * Design sandbox: glance mode across key aspects with Oxford Circus fixtures.
 * Does not put `board-glance` on <html> — that would lock page scroll.
 * Not a public product surface.
 */
export const BoardGlanceDraft = () => {
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
    <div className="min-h-svh bg-muted/40 p-4 md:p-6">
      <p className="mb-4 max-w-prose text-sm text-muted-foreground">
        Glance mode — one anchor (or an equal pair) beside quarter tiles,
        grouped by line and direction. Same fixtures across layouts and aspects.
      </p>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-10">
        {FRAMES.map((frame) => (
          <section key={frame.label} className="min-w-0">
            <p className="mb-2 text-sm font-medium text-foreground">
              {frame.label}
            </p>
            <div
              className="board-embed board-glance mx-auto flex flex-col overflow-hidden border border-border bg-background text-foreground shadow-sm"
              style={{
                ...boardGlanceGutterCss(24),
                width: "100%",
                maxWidth: frame.width,
                aspectRatio: `${frame.width} / ${frame.height}`,
              }}
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <BoardGlanceArrivals
                  stopName="Oxford Circus"
                  data={OXFORD_CIRCUS_ARRIVALS}
                  pair={frame.pair}
                  room={frame.room}
                  interactive={frame.interactive}
                  className="min-h-0 flex-1"
                />
              </div>
              {footer}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
