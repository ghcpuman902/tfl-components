import { readFileSync } from "node:fs"
import { join } from "node:path"
import { ImageResponse } from "@takumi-rs/image-response"
import { BoardShareLiveOgImage } from "@/components/og/board-share-live-og-image"
import { resolveBoardShareLiveOg } from "@/lib/og/board-share-live-og"
import { OG_IMAGE } from "@/lib/og/image"
import { SITE_HOST } from "@/lib/site"
import { decodeBoardShortSlug } from "@/lib/tfl/board-short-link"
import {
  getBoardStationNamesIndex,
  lookupBoardStationName,
} from "@/lib/tfl/board-station-names"

const hammersmith = readFileSync(
  join(process.cwd(), "assets/fonts/hammersmith-one/HammersmithOne-Regular.ttf")
)

/**
 * Live card per short link. Data comes from the Board's shared TfL caches;
 * the CDN holds each card for a minute so a link pasted into a busy chat
 * costs one render, not one per preview.
 */
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await params
  const index = getBoardStationNamesIndex()
  const decoded = decodeBoardShortSlug(slug, (id) =>
    lookupBoardStationName(index, id)
  )
  if (!decoded) return new Response("Not found", { status: 404 })
  const model = await resolveBoardShareLiveOg(decoded.config)
  return new ImageResponse(
    <BoardShareLiveOgImage model={model} host={SITE_HOST} />,
    {
      width: OG_IMAGE.width,
      height: OG_IMAGE.height,
      headers: {
        "Cache-Control": model.live
          ? "public, max-age=60, s-maxage=60, stale-while-revalidate=300"
          : "public, max-age=30, s-maxage=30",
      },
      fonts: [
        {
          name: "Hammersmith One",
          data: hammersmith,
          weight: 400,
          style: "normal",
        },
      ],
    }
  )
}
