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

const CORNER = IPAD_SCREEN.rx ?? 6.9508
/** Top inset to the straight run of the screen, below the rounded corners. */
const TOP_INSET_PCT = (CORNER / IPAD_SCREEN.height) * 100

export const IpadBoardFrame = ({ interactive }: IpadBoardFrameProps) => (
  <div
    className="size-full"
    style={{
      clipPath: `inset(${TOP_INSET_PCT}% 0 -100% 0)`,
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
        pointerEvents: interactive ? "auto" : "none",
      }}
    />
  </div>
)
