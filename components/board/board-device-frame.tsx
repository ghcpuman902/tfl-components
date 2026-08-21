/**
 * Device chrome for Board preview.
 * Wide geometry is the landing-hero iPad (`#landing-ipad` in
 * `app/temp/landing-hero/landing-artwork.tsx`), normalised to a local viewBox.
 * Narrow is a matching iPhone-style case. Screen contents are HTML, not SVG.
 */

export const IPAD_CASE_FILL = "#b6ccbe"

/** Normalised from landing-ipad case 125.7409×88.4773. */
const IPAD_CASE_RX = 8.9667
const IPAD_BEZEL_X = 3.4952

const IPAD = {
  vb: { w: 125.7409, h: 88.4773 },
  caseRx: IPAD_CASE_RX,
  screen: {
    x: IPAD_BEZEL_X,
    y: 3.2947,
    w: 110.3998,
    h: 82.2392,
    rx: IPAD_CASE_RX - IPAD_BEZEL_X * 0.7,
  },
  camera: { cx: 119.8267, cy: 44.2386, r: 3.4612 },
  cable: { x: 125.7409, y: 42.6481, w: 8.2482, h: 3.6 },
} as const

const IPHONE_BEZEL = 3.1
const IPHONE_CASE_RX = 12.5

const IPHONE = {
  vb: { w: 75, h: 154 },
  caseRx: IPHONE_CASE_RX,
  screen: {
    x: IPHONE_BEZEL,
    y: IPHONE_BEZEL,
    w: 75 - IPHONE_BEZEL * 2,
    h: 154 - IPHONE_BEZEL * 2,
    rx: IPHONE_CASE_RX - IPHONE_BEZEL,
  },
  button: { x: 0, y: 38, w: 1.4, h: 14 },
} as const

export const ipadScreenInset = {
  left: IPAD.screen.x / IPAD.vb.w,
  top: IPAD.screen.y / IPAD.vb.h,
  width: IPAD.screen.w / IPAD.vb.w,
  height: IPAD.screen.h / IPAD.vb.h,
  radius: IPAD.screen.rx / IPAD.vb.w,
} as const

export const iphoneScreenInset = {
  left: IPHONE.screen.x / IPHONE.vb.w,
  top: IPHONE.screen.y / IPHONE.vb.h,
  width: IPHONE.screen.w / IPHONE.vb.w,
  height: IPHONE.screen.h / IPHONE.vb.h,
  radius: IPHONE.screen.rx / IPHONE.vb.w,
} as const

export const IPAD_ASPECT = IPAD.vb.w / IPAD.vb.h
export const IPHONE_ASPECT = IPHONE.vb.w / IPHONE.vb.h

/** Circular case radius as CSS `x% / y%` so the skeleton matches the SVG. */
export const ipadCaseRounding = `${(IPAD.caseRx / IPAD.vb.w) * 100}% / ${(IPAD.caseRx / IPAD.vb.h) * 100}%`
export const iphoneCaseRounding = `${(IPHONE.caseRx / IPHONE.vb.w) * 100}% / ${(IPHONE.caseRx / IPHONE.vb.h) * 100}%`

export const IpadDeviceSvg = ({
  showCable = true,
}: {
  showCable?: boolean
} = {}) => (
  <svg
    viewBox={`0 0 ${IPAD.vb.w} ${IPAD.vb.h}`}
    className="absolute inset-0 size-full"
    aria-hidden
  >
    <rect
      width={IPAD.vb.w}
      height={IPAD.vb.h}
      rx={IPAD.caseRx}
      ry={IPAD.caseRx}
      fill={IPAD_CASE_FILL}
    />
    <rect
      x={IPAD.screen.x}
      y={IPAD.screen.y}
      width={IPAD.screen.w}
      height={IPAD.screen.h}
      rx={IPAD.screen.rx}
      ry={IPAD.screen.rx}
      fill="#fff"
    />
    <circle
      cx={IPAD.camera.cx}
      cy={IPAD.camera.cy}
      r={IPAD.camera.r}
      fill="#fff"
    />
    {showCable ? (
      <rect
        x={IPAD.cable.x}
        y={IPAD.cable.y}
        width={IPAD.cable.w}
        height={IPAD.cable.h}
        fill="#fff"
      />
    ) : null}
  </svg>
)

export const IphoneDeviceSvg = () => (
  <svg
    viewBox={`0 0 ${IPHONE.vb.w} ${IPHONE.vb.h}`}
    className="absolute inset-0 size-full"
    aria-hidden
  >
    <rect
      width={IPHONE.vb.w}
      height={IPHONE.vb.h}
      rx={IPHONE.caseRx}
      ry={IPHONE.caseRx}
      fill={IPAD_CASE_FILL}
    />
    <rect
      x={IPHONE.screen.x}
      y={IPHONE.screen.y}
      width={IPHONE.screen.w}
      height={IPHONE.screen.h}
      rx={IPHONE.screen.rx}
      ry={IPHONE.screen.rx}
      fill="#fff"
    />
    <rect
      x={IPHONE.button.x}
      y={IPHONE.button.y}
      width={IPHONE.button.w}
      height={IPHONE.button.h}
      rx={0.6}
      fill="#9bb3a6"
    />
  </svg>
)
