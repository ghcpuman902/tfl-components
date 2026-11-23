import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BoardShortLinkOpen } from "@/components/board/board-short-link-open"
import { boardShortLinkMetadata } from "@/lib/site-metadata"
import { resolveBoardSlots } from "@/lib/tfl/board-panels"
import { decodeBoardShortSlug } from "@/lib/tfl/board-short-link"
import {
  getBoardStationNamesIndex,
  lookupBoardStationName,
} from "@/lib/tfl/board-station-names"
import {
  boardShareQueryFromConfig,
  BOARD_VIEW_PATH,
} from "@/lib/tfl/board-url-state"
import { BOARD_SHARED_PARAM } from "@/lib/tfl/board-shared-arrival"

/** Blocking on purpose: link previews read og tags from the first response. */
export const instant = false

type Props = { params: Promise<{ slug: string }> }

const decode = (slug: string) => {
  const index = getBoardStationNamesIndex()
  return decodeBoardShortSlug(slug, (id) => lookupBoardStationName(index, id))
}

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { slug } = await params
  const decoded = decode(slug)
  if (!decoded) return { title: "Board not found", robots: { index: false } }
  const { config } = decoded
  return boardShortLinkMetadata({
    slug,
    stopName: config.stopName,
    firstPanel: resolveBoardSlots(config.slots.p1, config.slots.p2).p1[0],
  })
}

/** A short link opens the Board it encodes, marked as shared. */
export default async function BoardShortLinkPage({ params }: Props) {
  const { slug } = await params
  const decoded = decode(slug)
  if (!decoded) notFound()
  const query = new URLSearchParams(boardShareQueryFromConfig(decoded.config))
  query.set(BOARD_SHARED_PARAM, "1")
  const href = `${BOARD_VIEW_PATH}?${query.toString()}#${decoded.hash}`
  return (
    <BoardShortLinkOpen href={href} stationName={decoded.config.stopName} />
  )
}
