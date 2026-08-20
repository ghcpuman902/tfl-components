import { cacheLife } from "next/cache"
import { GITHUB_REPO } from "@/lib/feedback/constants"
import { getRedis } from "@/lib/redis"

export const STATS_VISITORS_KEY = "stats:visitors"
export const STATS_INSTALLS_KEY = "stats:installs"
export const STATS_GITHUB_STARS_KEY = "stats:github_stars"

export const VISITOR_COOKIE = "tfl_vid"
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
export const VISITOR_DEDUPE_TTL_SECONDS = 60 * 60 * 48
export const GITHUB_STARS_TTL_SECONDS = 3600

/** Foundation / catalog payloads — do not count as component installs. */
export const INSTALL_COUNT_EXCLUDE = new Set(["registry", "tfl-colours"])

const GITHUB_API_REPO = GITHUB_REPO.replace(
  "https://github.com/",
  "https://api.github.com/repos/"
)

export type SiteStats = {
  visitors: number
  installs: number
  stars: number | null
}

const parseCount = (value: string | null): number => {
  if (!value) return 0
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

const fetchGitHubStars = async (): Promise<number | null> => {
  try {
    const headers: HeadersInit = {
      Accept: "application/vnd.github+json",
      "User-Agent": "tfl-components-site-stats",
    }
    const token = process.env.GITHUB_TOKEN
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const res = await fetch(GITHUB_API_REPO, {
      headers,
      cache: "no-store",
    })
    if (!res.ok) return null

    const data = (await res.json()) as { stargazers_count?: unknown }
    const count = data.stargazers_count
    return typeof count === "number" && Number.isFinite(count) ? count : null
  } catch (err) {
    console.error("[site-stats] GitHub stars fetch failed", err)
    return null
  }
}

const getGitHubStars = async (): Promise<number | null> => {
  const redis = await getRedis()
  if (redis) {
    try {
      const cached = await redis.get(STATS_GITHUB_STARS_KEY)
      if (cached !== null) return parseCount(cached)
    } catch (err) {
      console.error("[site-stats] redis get stars failed", err)
    }
  }

  const stars = await fetchGitHubStars()
  if (stars === null) return null

  if (redis) {
    try {
      await redis.set(STATS_GITHUB_STARS_KEY, String(stars), {
        EX: GITHUB_STARS_TTL_SECONDS,
      })
    } catch (err) {
      console.error("[site-stats] redis set stars failed", err)
    }
  }

  return stars
}

/** Cached footer stats — revalidate about every minute. */
export async function getSiteStats(): Promise<SiteStats> {
  "use cache"
  cacheLife({ revalidate: 60 })

  const redis = await getRedis()
  let visitors = 0
  let installs = 0

  if (redis) {
    try {
      const [visitorsRaw, installsRaw] = await redis.mGet([
        STATS_VISITORS_KEY,
        STATS_INSTALLS_KEY,
      ])
      visitors = parseCount(visitorsRaw)
      installs = parseCount(installsRaw)
    } catch (err) {
      console.error("[site-stats] redis mGet failed", err)
    }
  }

  const stars = await getGitHubStars()

  return { visitors, installs, stars }
}

export const utcDateKey = (nowMs: number): string =>
  new Date(nowMs).toISOString().slice(0, 10)

export const visitorDedupeKey = (dateKey: string, vid: string): string =>
  `visitor:${dateKey}:${vid}`
