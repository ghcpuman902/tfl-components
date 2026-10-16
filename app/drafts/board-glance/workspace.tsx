"use client"

import { BoardGlanceArrivals } from "@/components/board/board-glance-arrivals"
import { BoardViewFooter } from "@/components/board/board-view-footer"
import { resolveGlanceArrivalsPageSize } from "@/lib/tfl/board-glance-arrivals"
import { boardGlanceGutterCss } from "@/lib/tfl/board-layout"
import { OXFORD_CIRCUS_ARRIVALS } from "@/lib/tfl/fixtures/arrivals-boards"

const FRAMES = [
  { label: "Square · 1088×1088", width: 1088, height: 1088 },
  { label: "Landscape · 1366×1024", width: 1366, height: 1024 },
  { label: "Portrait · 1024×1366", width: 1024, height: 1366 },
  { label: "Phone · 390×844", width: 390, height: 844 },
] as const

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
    <div className="min-h-dvh bg-muted/40 p-4 md:p-6 dark">
      <p className="mb-4 max-w-prose text-sm text-muted-foreground">
        Glance mode — room-distance type, few next trains, no scroll. Same
        fixtures at four aspect ratios.
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
                  pageSize={resolveGlanceArrivalsPageSize(
                    frame.height / frame.width
                  )}
                  pinFirst
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
