"use client"

import { useEffect, useRef } from "react"
import { BoardDisplay } from "@/components/board/board-display"
import type { BoardConfig } from "@/lib/tfl/board-url-state"
import {
  LANDING_BOARD_DEFAULT,
  type LandingBoardIndexes,
} from "@/lib/tfl/landing-board"
import {
  BOARD_IFRAME_HEIGHT,
  BOARD_IFRAME_WIDTH,
} from "./landing-artwork"

type IpadBoardFrameProps = {
  interactive: boolean
  board: LandingBoardIndexes
  previewConfig?: BoardConfig
}

export const IpadBoardFrame = ({
  interactive = true,
  board,
  previewConfig = LANDING_BOARD_DEFAULT.config,
}: IpadBoardFrameProps) => {
  const screenRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = screenRef.current
    const inner = innerRef.current
    if (!element || !inner) return
    let frame = 0
    let lastScale = -1
    const update = () => {
      const width = element.clientWidth
      const height = element.clientHeight
      if (width <= 0 || height <= 0) return
      const next = Math.min(
        width / BOARD_IFRAME_WIDTH,
        height / BOARD_IFRAME_HEIGHT
      )
      if (Math.abs(next - lastScale) < 0.0001) return
      lastScale = next
      inner.style.transform = `scale(${next})`
    }
    const schedule = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        update()
      })
    }
    update()
    const observer = new ResizeObserver(schedule)
    observer.observe(element)
    return () => {
      observer.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      ref={screenRef}
      className="relative size-full overflow-hidden bg-background"
      style={{ pointerEvents: interactive ? "auto" : "none" }}
    >
      <div
        ref={innerRef}
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: BOARD_IFRAME_WIDTH,
          height: BOARD_IFRAME_HEIGHT,
          transform: "scale(1)",
          pointerEvents: interactive ? "auto" : "none",
        }}
      >
        <BoardDisplay
          stationLines={board.stationLines}
          stationNames={board.stationNames}
          arrivalsStopIds={board.arrivalsStopIds}
          previewConfig={previewConfig}
        />
      </div>
    </div>
  )
}
