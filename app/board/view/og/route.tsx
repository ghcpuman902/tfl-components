import { readFileSync } from "node:fs"
import { join } from "node:path"
import { ImageResponse } from "@takumi-rs/image-response"
import { BoardDepartureImage } from "@/components/og/board-departure-image"
import { OG_IMAGE } from "@/lib/og/image"
import { getBoardStationNamesIndex, lookupBoardStationName } from "@/lib/tfl/board-station-names"


const hammersmith = readFileSync(
  join(process.cwd(), "assets/fonts/hammersmith-one/HammersmithOne-Regular.ttf")
)

const stationFromRequest = (request: Request): string => {
  const url = new URL(request.url)
  const named = url.searchParams.get("stopName")?.trim()
  if (named) return named
  const stop = url.searchParams.get("stop")?.trim()
  if (!stop) return "King's Cross St. Pancras"
  return (
    lookupBoardStationName(getBoardStationNamesIndex(), stop) ??
    "King's Cross St. Pancras"
  )
}

export const GET = async (request: Request) => {
  const stationName = stationFromRequest(request)
  return new ImageResponse(<BoardDepartureImage stationName={stationName} />, {
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
