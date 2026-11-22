/**
 * Budget for bus arrivals on the site key.
 *
 * TfL allows 500 calls a minute per key. The homepage keeps itself to 250 for
 * bus stops (about 80 stops watched at once, 3 calls a minute each), so the
 * rail poll and every other page keep their share. One store backs it: Redis in
 * production, memory when `REDIS_URL` is unset (each instance then counts alone).
 */
export const SITE_BUS_CALLS_PER_MIN = 250
export const VISITOR_NEW_STOPS_PER_MIN = 20
export const BUS_BACKOFF_SEC = 60
/** How long the last good rows stay available to serve while TfL is out of reach. */
export const BUS_ROWS_EXPIRE_SEC = 120

export type QuotaStore = {
  /** Adds one to a counter that lives `ttlSec`; returns the new count. */
  incr: (key: string, ttlSec: number) => Promise<number>
  /** Adds `member` unless the set already holds `max` others; returns whether it is in the set. */
  addToSet: (key: string, member: string, ttlSec: number, max: number) => Promise<boolean>
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string, ttlSec: number) => Promise<void>
}

export const createMemoryStore = (now: () => number = Date.now): QuotaStore => {
  const values = new Map<string, { value: string; until: number }>()
  const sets = new Map<string, { members: Set<string>; until: number }>()
  const live = <T extends { until: number }>(entry: T | undefined): T | undefined =>
    entry && entry.until > now() ? entry : undefined
  return {
    incr: async (key, ttlSec) => {
      const held = live(values.get(key))
      const count = held ? Number(held.value) + 1 : 1
      values.set(key, { value: String(count), until: held?.until ?? now() + ttlSec * 1000 })
      return count
    },
    addToSet: async (key, member, ttlSec, max) => {
      const held = live(sets.get(key)) ?? { members: new Set<string>(), until: now() + ttlSec * 1000 }
      sets.set(key, held)
      if (held.members.has(member)) return true
      if (held.members.size >= max) return false
      held.members.add(member)
      return true
    },
    get: async (key) => live(values.get(key))?.value ?? null,
    set: async (key, value, ttlSec) => {
      values.set(key, { value, until: now() + ttlSec * 1000 })
    },
  }
}

/** The part of a node-redis client the store uses. */
export type RedisLike = {
  incr: (key: string) => Promise<number>
  expire: (key: string, seconds: number) => Promise<unknown>
  sIsMember: (key: string, member: string) => Promise<boolean | number>
  sCard: (key: string) => Promise<number>
  sAdd: (key: string, member: string) => Promise<unknown>
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string, options: { EX: number }) => Promise<unknown>
}

export const createRedisStore = (redis: RedisLike): QuotaStore => ({
  incr: async (key, ttlSec) => {
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, ttlSec)
    return count
  },
  addToSet: async (key, member, ttlSec, max) => {
    if (await redis.sIsMember(key, member)) return true
    if ((await redis.sCard(key)) >= max) return false
    await redis.sAdd(key, member)
    await redis.expire(key, ttlSec)
    return true
  },
  get: (key) => redis.get(key),
  set: async (key, value, ttlSec) => {
    await redis.set(key, value, { EX: ttlSec })
  },
})

const minuteOf = (at: number) => Math.floor(at / 60_000)

/** One TfL bus-stop call, counted against the site's per-minute budget. */
export const admitSiteCall = async (store: QuotaStore, at: number): Promise<boolean> =>
  (await store.incr(`tfl:bus:site:${minuteOf(at)}`, 120)) <= SITE_BUS_CALLS_PER_MIN

/** A visitor asking for a stop; a stop they already asked for this minute is free. */
export const admitVisitorStop = (
  store: QuotaStore,
  visitor: string,
  stopId: string,
  at: number
): Promise<boolean> =>
  store.addToSet(
    `tfl:bus:visitor:${visitor}:${minuteOf(at)}`,
    stopId,
    120,
    VISITOR_NEW_STOPS_PER_MIN
  )

export const backoffKey = (stopId: string) => `tfl:bus:backoff:${stopId}`
export const rowsKey = (stopId: string) => `tfl:bus:rows:${stopId}`
