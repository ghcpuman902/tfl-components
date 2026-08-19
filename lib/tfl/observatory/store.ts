import { getRedis } from "@/lib/redis"
import {
  HISTORY_LIMIT,
  LINE_CATALOGUE_SUBJECT_ID,
  OBSERVATORY_LOCK_TTL_SECONDS,
} from "@/lib/tfl/observatory/inventory"
import type {
  ObservatoryHistoryEvent,
  ObservatoryStore,
  ObservatorySubject,
} from "@/lib/tfl/observatory/types"

export const OBSERVATORY_STATE_KEY = "observatory:v1:state"
export const OBSERVATORY_LOCK_KEY = "observatory:v1:lock"

export const emptyObservatoryStore = (nowIso: string): ObservatoryStore => ({
  version: 1,
  updatedAt: nowIso,
  latestCompleteAt: null,
  subjects: {},
  history: [],
  census: {},
  lastNotified: {},
})

export const isObservatoryStore = (
  value: unknown
): value is ObservatoryStore => {
  if (!value || typeof value !== "object") return false
  const record = value as Partial<ObservatoryStore>
  return (
    record.version === 1 &&
    typeof record.updatedAt === "string" &&
    typeof record.subjects === "object" &&
    record.subjects !== null &&
    Array.isArray(record.history)
  )
}

export const prependHistory = (
  store: ObservatoryStore,
  events: readonly ObservatoryHistoryEvent[]
): ObservatoryStore => ({
  ...store,
  history: [...events, ...store.history].slice(0, HISTORY_LIMIT),
})

export const upsertSubject = (
  store: ObservatoryStore,
  subject: ObservatorySubject
): ObservatoryStore => ({
  ...store,
  subjects: { ...store.subjects, [subject.id]: subject },
})

export const getLineCatalogueSubject = (
  store: ObservatoryStore
): ObservatorySubject | undefined => store.subjects[LINE_CATALOGUE_SUBJECT_ID]

export type ObservatoryRepository = {
  load: () => Promise<ObservatoryStore | null>
  save: (store: ObservatoryStore) => Promise<void>
  acquireLock: (ttlSeconds?: number) => Promise<boolean>
  releaseLock: () => Promise<void>
}

export const createMemoryObservatoryRepository = (
  initial?: ObservatoryStore | null
): ObservatoryRepository & { snapshot: () => ObservatoryStore | null } => {
  let store = initial ?? null
  let locked = false

  return {
    load: async () => store,
    save: async (next) => {
      store = next
    },
    acquireLock: async () => {
      if (locked) return false
      locked = true
      return true
    },
    releaseLock: async () => {
      locked = false
    },
    snapshot: () => store,
  }
}

export const createRedisObservatoryRepository = (): ObservatoryRepository => ({
  load: async () => {
    const redis = await getRedis()
    if (!redis) return null
    try {
      const raw = await redis.get(OBSERVATORY_STATE_KEY)
      if (!raw) return null
      const parsed: unknown = JSON.parse(raw)
      return isObservatoryStore(parsed) ? parsed : null
    } catch (err) {
      console.error("[observatory] redis load failed", err)
      return null
    }
  },
  save: async (store) => {
    const redis = await getRedis()
    if (!redis) {
      throw new Error("Redis is not configured — cannot persist observations.")
    }
    await redis.set(OBSERVATORY_STATE_KEY, JSON.stringify(store))
  },
  acquireLock: async (ttlSeconds = OBSERVATORY_LOCK_TTL_SECONDS) => {
    const redis = await getRedis()
    if (!redis) return false
    try {
      const result = await redis.set(OBSERVATORY_LOCK_KEY, "1", {
        NX: true,
        EX: ttlSeconds,
      })
      return result === "OK"
    } catch (err) {
      console.error("[observatory] redis lock failed", err)
      return false
    }
  },
  releaseLock: async () => {
    const redis = await getRedis()
    if (!redis) return
    try {
      await redis.del(OBSERVATORY_LOCK_KEY)
    } catch (err) {
      console.error("[observatory] redis unlock failed", err)
    }
  },
})
