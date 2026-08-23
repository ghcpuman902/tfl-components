"use client"

import { useEffect, useRef, useState } from "react"
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
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const element = screenRef.current
    if (!element) return
    const update = () => {
      const width = element.clientWidth
      const height = element.clientHeight
      if (width <= 0 || height <= 0) return
      setScale(
        Math.min(width / BOARD_IFRAME_WIDTH, height / BOARD_IFRAME_HEIGHT)
      )
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={screenRef}
      className="relative size-full overflow-hidden bg-background"
      style={{ pointerEvents: interactive ? "auto" : "none" }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: BOARD_IFRAME_WIDTH,
          height: BOARD_IFRAME_HEIGHT,
          transform: `scale(${scale})`,
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
