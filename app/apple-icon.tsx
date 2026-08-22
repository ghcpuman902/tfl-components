import { ImageResponse } from "next/og"
import { placeholderRoundelMark } from "@/lib/brand/placeholder-roundel-icon"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

/** Apple touch icon — grey filled placeholder roundel, not the trademarked mark. */
export default function AppleIcon() {
  return new ImageResponse(placeholderRoundelMark(size.width), { ...size })
}
