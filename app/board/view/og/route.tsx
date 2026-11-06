import { readFileSync } from "node:fs"
import { join } from "node:path"
import { ImageResponse } from "@takumi-rs/image-response"
import { BoardShareOgImage } from "@/components/og/board-share-og-image"
import { resolveBoardShareOg } from "@/lib/og/board-share-og"
import { OG_IMAGE } from "@/lib/og/image"
import { parseArrivalsLines } from "@/lib/tfl/board-settings"

const hammersmith = readFileSync(
  join(process.cwd(), "assets/fonts/hammersmith-one/HammersmithOne-Regular.ttf")
)

const modelFromRequest = (request: Request) => {
  const url = new URL(request.url)
  const stop = url.searchParams.get("stop")
  const stopName = url.searchParams.get("stopName")
  const lineIds = parseArrivalsLines(url.searchParams.get("a.lines") ?? "")
  return resolveBoardShareOg({
    stop,
    stopName,
    lineIds: lineIds ?? undefined,
  })
}

export const GET = async (request: Request) => {
  const model = modelFromRequest(request)
  return new ImageResponse(<BoardShareOgImage model={model} />, {
    width: OG_IMAGE.width,
    height: OG_IMAGE.height,
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
