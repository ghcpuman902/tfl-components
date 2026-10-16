import { readFileSync } from "node:fs"
import { join } from "node:path"
import { ImageResponse } from "@takumi-rs/image-response"
import { BoardDepartureImage } from "@/components/og/board-departure-image"
import { OG_IMAGE } from "@/lib/og/image"

export const alt = OG_IMAGE.alt
export const size = { width: OG_IMAGE.width, height: OG_IMAGE.height }
export const contentType = "image/png"

const hammersmith = readFileSync(
  join(process.cwd(), "assets/fonts/hammersmith-one/HammersmithOne-Regular.ttf")
)

export default function OpenGraphImage() {
  return new ImageResponse(<BoardDepartureImage />, {
    ...size,
    fonts: [
      {
        name: "Hammersmith One",
        data: hammersmith,
        weight: 400,
        style: "normal",
      },
    ],
  })
}
