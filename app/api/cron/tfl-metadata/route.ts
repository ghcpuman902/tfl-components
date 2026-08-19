import { sendObservatoryAlerts } from "@/lib/tfl/observatory/email"
import { isObservatoryCronAuthorized } from "@/lib/tfl/observatory/cron-auth"
import { createTflMetadataFetcher } from "@/lib/tfl/observatory/fetch"
import { runObservatoryPass } from "@/lib/tfl/observatory/observe"
import { createRedisObservatoryRepository } from "@/lib/tfl/observatory/store"
import { getRedis } from "@/lib/redis"

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

  return Response.json({
    ok: true,
    ran: result.ran,
    skipped: result.skipped ?? null,
    notable: result.notableEvents.length,
  })
}
