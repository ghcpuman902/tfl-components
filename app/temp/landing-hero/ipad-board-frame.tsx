"use client"

import {
  BOARD_IFRAME_HEIGHT,
  BOARD_IFRAME_SRC,
  BOARD_IFRAME_WIDTH,
  IPAD_SCREEN,
} from "./landing-artwork"

type IpadBoardFrameProps = {
  interactive: boolean
}

const SCALE = IPAD_SCREEN.width / BOARD_IFRAME_WIDTH

export const IpadBoardFrame = ({ interactive }: IpadBoardFrameProps) => (
  <div
    className="size-full overflow-hidden bg-white"
    style={{
      width: "100%",
      height: "100%",
      overflow: "hidden",
      borderRadius: `${IPAD_SCREEN.rx}px`,
      pointerEvents: interactive ? "auto" : "none",
    }}
  >
    <iframe
      title="Oxford Circus station display"
      src={BOARD_IFRAME_SRC}
      width={BOARD_IFRAME_WIDTH}
      height={BOARD_IFRAME_HEIGHT}
      tabIndex={interactive ? 0 : -1}
      style={{
        width: BOARD_IFRAME_WIDTH,
        height: BOARD_IFRAME_HEIGHT,
        border: 0,
        transform: `scale(${SCALE})`,
        transformOrigin: "top left",
        pointerEvents: interactive ? "auto" : "none",
      }}
    />
  </div>
)
