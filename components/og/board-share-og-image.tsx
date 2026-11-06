import type { CSSProperties } from "react"
import { TFL_BLUE, UNDERGROUND_RING_RED } from "@/lib/tfl/brand-colours"
import type { BoardShareOgLine, BoardShareOgModel } from "@/lib/og/board-share-og"

const INK = "#171717"
const PAPER = "#FFFFFF"
const CHIP = "#767676"
const FACE = "Hammersmith One"
const PAD_X = 48
const BRAND_BAND = 90
const BRAND_SIZE = 43

const face = (size: number, color: string = INK): CSSProperties => ({
  display: "flex",
  fontFamily: FACE,
  fontSize: size,
  color,
  lineHeight: 1,
  fontSynthesis: "none",
})

const roundelSrc = (disc: string, bar: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 615.3 500"><circle cx="308.123" cy="249.985" r="250" fill="${disc}"/><rect x="0" y="199.5" width="615.3" height="101.1" rx="50.55" ry="50.55" fill="${bar}"/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const brandFace = (color: string): CSSProperties => ({
  display: "flex",
  fontFamily: FACE,
  fontSize: BRAND_SIZE,
  color,
  lineHeight: 1,
  fontSynthesis: "none",
})

const BoldWord = ({ text }: { text: string }) => (
  <div style={{ ...brandFace(INK), WebkitTextStroke: `1.25px ${INK}` }}>
    {text}
  </div>
)

const LinePill = ({ line }: { line: BoardShareOgLine }) => {
  const onDark = line.id === "northern" || line.id === "piccadilly" || line.id === "bakerloo"
  return (
    <div
      style={{
        ...face(28, onDark ? PAPER : INK),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: 22,
        paddingRight: 22,
        height: 56,
        backgroundColor: line.color,
        borderRadius: 8,
        marginRight: 14,
        marginBottom: 14,
        flexShrink: 0,
      }}
    >
      {line.name}
    </div>
  )
}

/**
 * Share card for a real stop: name + its line pills.
 * No invented arrivals, and no bus column from another station.
 */
export const BoardShareOgImage = ({ model }: { model: BoardShareOgModel }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      backgroundColor: PAPER,
      color: INK,
      fontFamily: FACE,
    }}
  >
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        paddingLeft: PAD_X,
        paddingRight: PAD_X,
        paddingTop: 56,
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: 36 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          src={roundelSrc(UNDERGROUND_RING_RED, TFL_BLUE)}
          width={96}
          height={78}
          style={{ width: 96, height: 78, marginRight: 24 }}
        />
        <div style={{ ...face(54), flex: 1 }}>{model.stationName}</div>
      </div>
      <div style={{ ...face(24, CHIP), marginBottom: 20 }}>Lines at this stop</div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center" }}>
        {model.lines.length > 0 ? (
          model.lines.map((line) => <LinePill key={line.id} line={line} />)
        ) : (
          <div style={face(28, CHIP)}>Live board · open the link for arrivals</div>
        )}
      </div>
    </div>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        boxSizing: "border-box",
        width: "100%",
        height: BRAND_BAND,
        paddingLeft: PAD_X,
        paddingRight: PAD_X,
        backgroundColor: PAPER,
      }}
    >
      <BoldWord text="Board" />
      <div style={{ ...brandFace(CHIP), marginLeft: 12, marginRight: 12 }}>·</div>
      <div style={brandFace(CHIP)}>tfl.manglekuo.com</div>
    </div>
  </div>
)
