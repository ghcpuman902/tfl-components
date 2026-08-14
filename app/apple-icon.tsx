import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon — line-colour bars, no trademarked roundel. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 12,
          padding: 24,
          background: "#0a0a0a",
        }}
      >
        <div style={{ height: 18, width: "100%", background: "#E32017" }} />
        <div style={{ height: 18, width: "100%", background: "#0098D4" }} />
        <div style={{ height: 18, width: "100%", background: "#00782A" }} />
        <div style={{ height: 18, width: "100%", background: "#F3A9BB" }} />
      </div>
    ),
    { ...size },
  );
}
