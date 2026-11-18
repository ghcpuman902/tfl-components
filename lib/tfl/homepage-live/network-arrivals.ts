import { cacheLife, cacheTag } from "next/cache"
import { isTflRateLimitError } from "@/lib/tfl/board-rate-limit"
import { getTflClient } from "@/lib/tfl/client"
import { compactRound, type CompactRound } from "@/lib/tfl/homepage-live/compact"

/** Every line the homepage draws: Tube, DLR, Elizabeth, the six Overground lines and the tram. */
export const HOMEPAGE_LINE_IDS = [
  "bakerloo",
  "central",
  "circle",
  "district",
  "dlr",
  "elizabeth",
  "hammersmith-city",
  "jubilee",
  "liberty",
  "lioness",
  "metropolitan",
  "mildmay",
  "northern",
  "piccadilly",
  "suffragette",
  "tram",
  "victoria",
  "waterloo-city",
  "weaver",
  "windrush",
] as const

export type NetworkRoundState =
  | { ok: true; round: CompactRound }
  | { ok: false; rateLimited: boolean }

/**
 * One TfL call (`GET /Line/{all}/Arrivals`) shared by every visitor for about
 * 20 s, then compacted. Three TfL calls a minute however many people look.
 * `remote`, so every function instance reads one entry and live arrivals are
 * never part of a build. Only call it at request time (a server action).
 * `round.at` is stamped here, at the TfL read, not when a client applies it.
 */
export async function getCachedNetworkRound(): Promise<NetworkRoundState> {
  "use cache: remote"
  cacheLife({ stale: 20, revalidate: 20, expire: 120 })
  cacheTag("tfl-network-arrivals")

  try {
    const arrivals = await getTflClient().line.getArrivals({
      lineIds: [...HOMEPAGE_LINE_IDS],
    })
    return { ok: true, round: compactRound(arrivals, Date.now()) }
  } catch (error) {
    if (isTflRateLimitError(error)) return { ok: false, rateLimited: true }
    throw error
  }
}
