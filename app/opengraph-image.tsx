import { ImageResponse } from "next/og"
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site"

export const alt = SITE_TAGLINE
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 88px",
          backgroundColor: "#ffffff",
          color: "#0a0a0a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 22,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "#b3b3b3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: "#737373",
                }}
              />
            </div>
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 600,
              letterSpacing: "-0.03em",
            }}
          >
            {SITE_NAME}
          </div>
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 36,
            lineHeight: 1.35,
            maxWidth: 960,
            color: "#171717",
          }}
        >
          {SITE_TAGLINE}
        </div>
      </div>
    ),
    { ...size }
  )
}
