"use client"

import { HOME_RAIL_STOP } from "@/lib/tfl/home-arrivals-stops"
import { buildBoardHref } from "@/lib/tfl/board-url-state"
import {
  BOARD_IFRAME_HEIGHT,
  BOARD_IFRAME_WIDTH,
} from "./landing-artwork"

type IpadBoardFrameProps = {
  interactive: boolean
}

/** Default hosted Board — interactive Oxford Circus, rail + status. */
const BOARD_IFRAME_SRC = buildBoardHref({ stop: HOME_RAIL_STOP.id })

export const IpadBoardFrame = ({ interactive }: IpadBoardFrameProps) => (
  <div
    className="size-full overflow-hidden"
    style={{ pointerEvents: interactive ? "auto" : "none" }}
  >
    <iframe
      title="Oxford Circus station display"
      src={BOARD_IFRAME_SRC}
      width={BOARD_IFRAME_WIDTH}
      height={BOARD_IFRAME_HEIGHT}
      tabIndex={interactive ? 0 : -1}
      className="size-full border-0 bg-background"
      style={{ pointerEvents: interactive ? "auto" : "none" }}
    />
  </div>
)
