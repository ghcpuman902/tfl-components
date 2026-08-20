import { randomUUID } from "node:crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getRedis } from "@/lib/redis"
import {
  STATS_VISITORS_KEY,
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE,
  VISITOR_DEDUPE_TTL_SECONDS,
  utcDateKey,
  visitorDedupeKey,
} from "@/lib/site-stats"

const isValidVid = (value: string | undefined): value is string =>
  Boolean(value && /^[0-9a-f-]{36}$/i.test(value))

export async function POST() {
  const jar = await cookies()
  const existing = jar.get(VISITOR_COOKIE)?.value
  const vid = isValidVid(existing) ? existing : randomUUID()
  const isNewCookie = !isValidVid(existing)

  const redis = await getRedis()
  if (redis) {
    try {
      const dateKey = utcDateKey(Date.now())
      const dedupeKey = visitorDedupeKey(dateKey, vid)
      const set = await redis.set(dedupeKey, "1", {
        NX: true,
        EX: VISITOR_DEDUPE_TTL_SECONDS,
      })
      if (set === "OK") {
        await redis.incr(STATS_VISITORS_KEY)
      }
    } catch (err) {
      console.error("[stats/visit] redis failed", err)
    }
  }

  const res = NextResponse.json({ ok: true })
  if (isNewCookie) {
    res.cookies.set(VISITOR_COOKIE, vid, {
      path: "/",
      maxAge: VISITOR_COOKIE_MAX_AGE,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
    })
  }
  return res
}
