import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  bundleIsStale,
  servedIsNewer,
  STALE_AFTER_MS,
} from "@/lib/tfl/stop-index-served"
import { adoptServedStopIndex, loadStopSearch } from "@/lib/tfl/stop-index"

describe("served stop index", () => {
  it("only asks for the served copy once the bundle is a day and a half old", () => {
    const now = Date.parse("2026-11-20T00:00:00Z")
    assert.equal(bundleIsStale(new Date(now - STALE_AFTER_MS + 60_000).toISOString(), now), false)
    assert.equal(bundleIsStale(new Date(now - STALE_AFTER_MS - 60_000).toISOString(), now), true)
    assert.equal(bundleIsStale("garbage", now), true)
  })

  it("prefers the served copy only when it is newer", () => {
    assert.equal(servedIsNewer("2026-11-13T13:14:09Z", "2026-11-19T04:30:00Z"), true)
    assert.equal(servedIsNewer("2026-11-13T13:14:09Z", "2026-11-13T13:14:09Z"), false)
    assert.equal(servedIsNewer("2026-11-19T04:30:00Z", "2026-11-13T13:14:09Z"), false)
  })

  it("keeps the bundled snapshot when the served copy is missing or broken", async () => {
    const kit = await loadStopSearch()
    const bundled = kit.index
    const missing = (async () => new Response("{}", { status: 404 })) as typeof fetch
    assert.equal(await adoptServedStopIndex(kit, missing), false)
    const broken = (async () => new Response("not json", { status: 200 })) as typeof fetch
    assert.equal(await adoptServedStopIndex(kit, broken), false)
    assert.equal(kit.index, bundled)
  })
})
