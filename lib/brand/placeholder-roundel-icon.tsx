import type { ReactElement } from "react"

const BASE = 180
const DISC = 146
const BAR_HEIGHT = 30

/** Grey filled placeholder roundel for generated PNG icons. */
export const placeholderRoundelMark = (size: number): ReactElement => {
  const disc = Math.round((DISC / BASE) * size)
  const barHeight = Math.round((BAR_HEIGHT / BASE) * size)
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          position: "absolute",
          display: "flex",
          width: disc,
          height: disc,
          borderRadius: disc / 2,
          background: "rgba(115, 115, 115, 0.35)",
        }}
      />
      <div
        style={{
          position: "absolute",
          display: "flex",
          width: size,
          height: barHeight,
          borderRadius: barHeight / 2,
          background: "rgba(115, 115, 115, 0.85)",
        }}
      />
    </div>
  )
}
