import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createStaticMetadataFetcher } from "@/lib/tfl/observatory/fetch"
import { LINE_CATALOGUE_SUBJECT_ID } from "@/lib/tfl/observatory/inventory"
import { runObservatoryPass } from "@/lib/tfl/observatory/observe"
import { toObservatoryPageData } from "@/lib/tfl/observatory/page-data"
import {
  createMemoryObservatoryRepository,
  emptyObservatoryStore,
} from "@/lib/tfl/observatory/store"
import type { RawLine, RawStopPoint } from "@/lib/tfl/observatory/types"

const lines: RawLine[] = [
  { id: "district", name: "District", modeName: "tube" },
  { id: "victoria", name: "Victoria", modeName: "tube" },
]

const stopsFor = (
  lineId: string,
  extras: RawStopPoint[] = []
): RawStopPoint[] => {
  const base: RawStopPoint[] = Array.from({ length: 12 }, (_, index) => ({
    id: `${lineId}-stop-${index}`,
    commonName: `${lineId} stop ${index}`,
  }))
  return [...base, ...extras]
}

const routesFor = (lineId: string) => ({
  [`${lineId}:inbound`]: {
    lineId,
    direction: "inbound",
    orderedLineRoutes: [
      {
        name: "Main",
        naptanIds: Array.from(
          { length: 12 },
          (_, index) => `${lineId}-stop-${index}`
        ),
      },
    ],
  },
  [`${lineId}:outbound`]: {
    lineId,
    direction: "outbound",
    orderedLineRoutes: [
      {
        name: "Main",
        naptanIds: Array.from(
          { length: 12 },
          (_, index) => `${lineId}-stop-${11 - index}`
        ),
      },
    ],
  },
})

const completeFetcher = (overrides?: {
  lines?: RawLine[]
  stops?: Record<string, RawStopPoint[]>
  census?: Partial<Record<"bus-lines" | "bus-points" | "bike-points", number>>
}) =>
  createStaticMetadataFetcher({
    lines: overrides?.lines ?? lines,
    stops: overrides?.stops ?? {
      district: stopsFor("district"),
      victoria: stopsFor("victoria"),
    },
    routes: {
      ...routesFor("district"),
      ...routesFor("victoria"),
    },
    census: overrides?.census,
  })

describe("observatory persistence and confirmation", () => {
  it("establishes a baseline on the first complete run", async () => {
    const repo = createMemoryObservatoryRepository()
    const result = await runObservatoryPass({
      fetcher: completeFetcher(),
      store: repo,
      nowMs: Date.parse("2026-08-19T04:15:00.000Z"),
    })

    assert.equal(result.ran, true)
    assert.equal(
      result.store.subjects[LINE_CATALOGUE_SUBJECT_ID]?.state,
      "current"
    )
    assert.equal(result.store.subjects["stops:district"]?.state, "current")
    assert.ok(result.store.latestCompleteAt)
    assert.equal(
      result.store.history[0]?.summary.includes("No metadata change"),
      true
    )
    assert.equal(result.store.census?.["bus-lines"]?.state, "current")
    assert.equal(result.store.census?.["bus-points"]?.state, "current")
    assert.equal(result.store.census?.["bike-points"]?.state, "current")
    assert.equal(
      result.store.history.filter((event) => event.subjectId === null).length,
      1
    )
    assert.equal(
      result.store.history.some((event) =>
        (event.subjectId ?? "").startsWith("census:")
      ),
      false
    )
  })

  it("records a one-stop bus count drift without raising attention", async () => {
    const repo = createMemoryObservatoryRepository()
    const result = await runObservatoryPass({
      fetcher: completeFetcher({
        census: { "bus-points": 32_555 },
      }),
      store: repo,
      nowMs: Date.parse("2026-08-19T04:15:00.000Z"),
    })

    assert.equal(result.store.census?.["bus-points"]?.state, "current")
    assert.match(
      result.store.census?.["bus-points"]?.summary ?? "",
      /\+1/
    )
    const page = toObservatoryPageData(result.store)
    assert.equal(
      page.attention.some((item) => item.id === "census:bus-points"),
      false
    )
    assert.equal(
      page.census.find((row) => row.id === "bus-points")?.delta,
      1
    )
  })

  it("compares the next census count to yesterday, not the seed", async () => {
    const repo = createMemoryObservatoryRepository()
    await runObservatoryPass({
      fetcher: completeFetcher({
        census: { "bus-points": 32_560 },
      }),
      store: repo,
      nowMs: Date.parse("2026-08-19T04:15:00.000Z"),
    })
    const second = await runObservatoryPass({
      fetcher: completeFetcher({
        census: { "bus-points": 32_561 },
      }),
      store: repo,
      nowMs: Date.parse("2026-08-20T04:15:00.000Z"),
    })
    assert.equal(second.store.census?.["bus-points"]?.baselineCount, 32_560)
    assert.equal(second.store.census?.["bus-points"]?.observedCount, 32_561)
    const page = toObservatoryPageData(second.store)
    assert.equal(
      page.census.find((row) => row.id === "bus-points")?.delta,
      1
    )
  })

  it("flags a census count outside the 10% band", async () => {
    const repo = createMemoryObservatoryRepository()
    const result = await runObservatoryPass({
      fetcher: completeFetcher({
        census: { "bike-points": 500 },
      }),
      store: repo,
      nowMs: Date.parse("2026-08-19T04:15:00.000Z"),
    })

    assert.equal(result.store.census?.["bike-points"]?.state, "incomplete")
    const page = toObservatoryPageData(result.store)
    assert.equal(page.overallState, "incomplete")
    assert.equal(
      page.attention.some((item) => item.id === "census:bike-points"),
      true
    )
  })

  it("confirms two added stop points as a change", async () => {
    const repo = createMemoryObservatoryRepository()
    await runObservatoryPass({
      fetcher: completeFetcher(),
      store: repo,
      nowMs: Date.parse("2026-08-19T04:15:00.000Z"),
    })

    const extras: RawStopPoint[] = [
      { id: "district-new-1", commonName: "New Halt" },
      { id: "district-new-2", commonName: "Newer Halt" },
    ]
    const second = await runObservatoryPass({
      fetcher: completeFetcher({
        stops: {
          district: stopsFor("district", extras),
          victoria: stopsFor("victoria"),
        },
      }),
      store: repo,
      nowMs: Date.parse("2026-08-20T04:15:00.000Z"),
    })

    const district = second.store.subjects["stops:district"]
    assert.equal(district?.state, "changed")
    assert.match(
      district?.lastObservation?.summary ?? "",
      /2 stop points added/
    )
    assert.equal(district?.baseline?.itemCount, 14)
    assert.equal(
      second.store.history.some((event) => event.state === "changed"),
      true
    )
    const page = toObservatoryPageData(second.store)
    assert.equal(
      page.datasets.find((dataset) => dataset.id === "stops")?.delta,
      2
    )
    assert.equal(second.store.previousItemCounts?.stops, 24)
  })

  it("does not persist an empty District stop list as a baseline update", async () => {
    const repo = createMemoryObservatoryRepository()
    await runObservatoryPass({
      fetcher: completeFetcher(),
      store: repo,
      nowMs: Date.parse("2026-08-19T04:15:00.000Z"),
    })
    const before = repo.snapshot()?.subjects["stops:district"]?.baseline?.hash

    const second = await runObservatoryPass({
      fetcher: completeFetcher({
        stops: {
          district: [],
          victoria: stopsFor("victoria"),
        },
      }),
      store: repo,
      nowMs: Date.parse("2026-08-20T04:15:00.000Z"),
    })

    const district = second.store.subjects["stops:district"]
    assert.equal(district?.state, "unavailable")
    assert.equal(district?.baseline?.hash, before)
    assert.equal(
      district?.lastObservation?.summary,
      "TfL returned no stop points for the District line."
    )
  })

  it("skips a run when the lock is held", async () => {
    const existing = emptyObservatoryStore("2026-08-19T00:00:00.000Z")
    const repo = createMemoryObservatoryRepository(existing)
    await repo.acquireLock()
    const result = await runObservatoryPass({
      fetcher: completeFetcher(),
      store: repo,
      nowMs: Date.parse("2026-08-19T04:15:00.000Z"),
    })
    assert.equal(result.ran, false)
    assert.equal(result.skipped, "lock")
  })
})

describe("page data", () => {
  it("presents unknown when no store exists", () => {
    const page = toObservatoryPageData(null)
    assert.equal(page.overallState, "unknown")
    assert.equal(page.emptyReason, "no-store")
    assert.equal(page.attention.length, 0)
  })

  it("surfaces confirmed changes and history for the page", async () => {
    const repo = createMemoryObservatoryRepository()
    await runObservatoryPass({
      fetcher: completeFetcher(),
      store: repo,
      nowMs: Date.parse("2026-08-19T04:15:00.000Z"),
    })
    await runObservatoryPass({
      fetcher: completeFetcher({
        stops: {
          district: stopsFor("district", [
            { id: "district-new-1", commonName: "New Halt" },
          ]),
          victoria: stopsFor("victoria"),
        },
      }),
      store: repo,
      nowMs: Date.parse("2026-08-20T04:15:00.000Z"),
    })

    const page = toObservatoryPageData(repo.snapshot())
    assert.equal(page.overallState, "changed")
    assert.equal(page.emptyReason, null)
    assert.ok(page.latestCompleteAt)
    assert.equal(
      page.attention.some((item) => item.id === "stops:district"),
      true
    )
    assert.equal(
      page.datasets.find((dataset) => dataset.id === "stops")?.state,
      "changed"
    )
    assert.equal(
      page.datasets.find((dataset) => dataset.id === "stops")?.delta,
      1
    )
    assert.ok(page.history.length > 0)
    assert.equal(
      page.history.filter((event) =>
        (event.subjectId ?? "").startsWith("census:")
      ).length,
      0
    )
  })

  it("ranks unavailable above a metadata change", () => {
    const store = emptyObservatoryStore("2026-08-19T04:15:00.000Z")
    store.subjects[LINE_CATALOGUE_SUBJECT_ID] = {
      id: LINE_CATALOGUE_SUBJECT_ID,
      kind: "line-catalogue",
      label: "Line catalogue",
      state: "changed",
      baseline: null,
      lastObservation: {
        at: store.updatedAt,
        kind: "confirmation",
        state: "changed",
        hash: "abc",
        itemCount: 2,
        summary: "1 line added.",
      },
    }
    store.subjects["stops:district"] = {
      id: "stops:district",
      kind: "stop-points",
      label: "District line stop points",
      lineId: "district",
      lineName: "District",
      modeName: "tube",
      state: "unavailable",
      baseline: null,
      lastObservation: {
        at: store.updatedAt,
        kind: "confirmation",
        state: "unavailable",
        hash: null,
        itemCount: 0,
        summary: "TfL returned no stop points for the District line.",
      },
    }

    const page = toObservatoryPageData(store)
    assert.equal(page.overallState, "unavailable")
    assert.equal(page.attention[0]?.id, "stops:district")
  })
})
