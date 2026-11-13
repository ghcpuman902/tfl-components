import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"
import { STOP_INDEX } from "tfl-ts/meta/stops"
import { METADATA_CACHE_TAGS } from "@/lib/tfl/metadata-cache-tags"
import {
  storeStopIndexIfChanged,
  stopIndexContentHash,
} from "@/lib/tfl/stop-index-refresh"
import { SERVED_INDEX_KEY } from "@/lib/tfl/stop-index-served"

const fakeRedis = (initial?: string) => {
  const store = new Map<string, string>(initial ? [[SERVED_INDEX_KEY, initial]] : [])
  let writes = 0
  return {
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: string) => {
      writes++
      store.set(key, value)
    },
    writes: () => writes,
    held: () => store.get(SERVED_INDEX_KEY),
  }
}

const built = STOP_INDEX.data

describe("served stop index refresh", () => {
  it("ignores the build time when comparing content", () => {
    const later = { ...built, generatedAt: "2099-01-01T00:00:00.000Z" }
    assert.equal(stopIndexContentHash(later), stopIndexContentHash(built))
    assert.notEqual(
      stopIndexContentHash({ ...built, names: [...built.names, "New Stop"] }),
      stopIndexContentHash(built)
    )
  })

  it("writes nothing when a rebuild says the same, so the stored build time stays", async () => {
    const redis = fakeRedis(JSON.stringify(built))
    const rebuilt = { ...built, generatedAt: "2099-01-01T00:00:00.000Z" }
    assert.equal(await storeStopIndexIfChanged(redis, rebuilt), "unchanged")
    assert.equal(redis.writes(), 0)
    assert.equal(JSON.parse(redis.held()!).generatedAt, built.generatedAt)
  })

  it("stores a rebuild that differs", async () => {
    const redis = fakeRedis(JSON.stringify(built))
    const changed = { ...built, names: [...built.names, "New Stop"], generatedAt: "2099-01-01T00:00:00.000Z" }
    assert.equal(await storeStopIndexIfChanged(redis, changed), "stored")
    assert.equal(JSON.parse(redis.held()!).generatedAt, "2099-01-01T00:00:00.000Z")
  })

  it("stores when nothing, or something unreadable, is held", async () => {
    const none = fakeRedis()
    assert.equal(await storeStopIndexIfChanged(none, built), "stored")
    const broken = fakeRedis("not json")
    assert.equal(await storeStopIndexIfChanged(broken, built), "stored")
  })
})

const filesUnder = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return filesUnder(full)
    return full.endsWith(".ts") && !full.endsWith(".test.ts") ? [full] : []
  })

describe("metadata cron tags", () => {
  it("every long-lived (days) cache carries a tag the cron revalidates", () => {
    const tags = new Set<string>(METADATA_CACHE_TAGS)
    for (const file of filesUnder(path.join(process.cwd(), "lib"))) {
      const source = readFileSync(file, "utf8")
      if (!source.includes('cacheLife("days")')) continue
      const tagged = [...source.matchAll(/cacheTag\(([^)]*)\)/g)].some((m) =>
        [...m[1]!.matchAll(/"([^"]+)"/g)].some((t) => tags.has(t[1]!))
      )
      assert.ok(tagged, `${file} has a days cache with no tag the cron revalidates`)
    }
  })

  it("the cron's tags are all used by a cache", () => {
    const sources = filesUnder(path.join(process.cwd(), "lib")).map((f) => readFileSync(f, "utf8"))
    for (const tag of METADATA_CACHE_TAGS)
      assert.ok(
        sources.some((s) => s.includes(`cacheTag(`) && s.includes(`"${tag}"`)),
        tag
      )
  })
})
