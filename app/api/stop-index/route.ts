import { getRedis } from "@/lib/redis"
import { readServedStopIndex } from "@/lib/tfl/stop-index-refresh"

/** The daily-refreshed stop index, for pages whose bundled snapshot has gone stale. */
export async function GET() {
  const redis = await getRedis()
  const data = redis ? await readServedStopIndex(redis).catch(() => null) : null
  if (!data) return Response.json({ ok: false }, { status: 404 })
  return Response.json(data, {
    headers: {
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}
