import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

/** Apple touch icon — grey filled placeholder roundel, not the trademarked mark. */
export default function AppleIcon() {
  return new ImageResponse(
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
          width: 146,
          height: 146,
          borderRadius: 73,
          background: "rgba(115, 115, 115, 0.35)",
        }}
      />
      <div
        style={{
          position: "absolute",
          display: "flex",
          width: 180,
          height: 30,
          borderRadius: 15,
          background: "rgba(115, 115, 115, 0.85)",
        }}
      />
    </div>,
    { ...size }
  )
}
