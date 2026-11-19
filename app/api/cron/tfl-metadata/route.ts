import { revalidateTag } from "next/cache"
import { METADATA_CACHE_TAGS } from "@/lib/tfl/metadata-cache-tags"
import { sendObservatoryAlerts } from "@/lib/tfl/observatory/email"
import { isObservatoryCronAuthorized } from "@/lib/tfl/observatory/cron-auth"
import { createTflMetadataFetcher } from "@/lib/tfl/observatory/fetch"
import { runObservatoryPass } from "@/lib/tfl/observatory/observe"
import { createRedisObservatoryRepository } from "@/lib/tfl/observatory/store"
import { getRedis } from "@/lib/redis"
import { refreshServedStopIndex } from "@/lib/tfl/stop-index-refresh"

export const maxDuration = 300

export async function GET(request: Request) {
  if (!isObservatoryCronAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 })
  }

  const redis = await getRedis()
  if (!redis) {
    return Response.json(
      { ok: false, error: "Redis is not configured." },
      { status: 503 }
    )
  }

  const result = await runObservatoryPass({
    fetcher: createTflMetadataFetcher(),
    store: createRedisObservatoryRepository(),
    nowMs: Date.now(),
    notify: sendObservatoryAlerts,
  })

  // Static metadata caches are refreshed after a pass that ran; with "max" the
  // old entry is served while the new one is read. Live arrival tags are left alone.
  if (result.ran) for (const tag of METADATA_CACHE_TAGS) revalidateTag(tag, "max")

  const stopIndex = await refreshServedStopIndex(redis)

  return Response.json({
    ok: true,
    ran: result.ran,
    revalidated: result.ran ? METADATA_CACHE_TAGS.length : 0,
    skipped: result.skipped ?? null,
    notable: result.notableEvents.length,
    stopIndex,
  })
}
