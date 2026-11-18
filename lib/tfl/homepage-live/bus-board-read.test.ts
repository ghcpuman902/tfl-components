import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  busReadPlan,
  FIRST_READ_TIMEOUT_MS,
  keepHeldOnFailure,
  POLL_TIMEOUT_MS,
  readWithRetry,
  ReadTimeoutError,
  withTimeout,
} from "@/lib/tfl/homepage-live/bus-board-read"

const after = <T>(ms: number, value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms))
const never = <T>() => new Promise<T>(() => {})

/** A read whose call n answers with `answers[n]()` (the last one repeats); counts its calls. */
const scripted = <T>(answers: (() => Promise<T>)[]) => {
  const read = () => {
    const answer = answers[Math.min(read.calls, answers.length - 1)]!
    read.calls += 1
    return answer()
  }
  read.calls = 0
  return read
}

describe("bus board read plan", () => {
  it("waits longer and retries once before any rows are shown", () => {
    assert.deepEqual(busReadPlan(false), { timeoutMs: FIRST_READ_TIMEOUT_MS, retries: 1 })
    assert.ok(FIRST_READ_TIMEOUT_MS >= 20_000)
  })

  it("polls quickly without a retry once rows are held", () => {
    assert.deepEqual(busReadPlan(true), { timeoutMs: POLL_TIMEOUT_MS, retries: 0 })
  })
})

describe("withTimeout", () => {
  it("passes a prompt answer through", async () => {
    assert.equal(await withTimeout(after(1, "rows"), 50), "rows")
  })

  it("rejects with a timeout when the answer is late", async () => {
    await assert.rejects(withTimeout(never(), 5), ReadTimeoutError)
  })
})

describe("readWithRetry", () => {
  type Answer = { ok: true } | { ok: false; error: string }

  it("retries once after a timeout and returns the retry's answer", async () => {
    const read = scripted<Answer>([never, () => after<Answer>(1, { ok: true })])
    const result = await readWithRetry(read, { timeoutMs: 10, retries: 1 })
    assert.deepEqual(result, { ok: true })
    assert.equal(read.calls, 2)
  })

  it("retries once after a thrown error", async () => {
    const read = scripted<Answer>([
      () => Promise.reject(new Error("network")),
      () => after<Answer>(1, { ok: true }),
    ])
    const result = await readWithRetry(read, { timeoutMs: 50, retries: 1 })
    assert.deepEqual(result, { ok: true })
    assert.equal(read.calls, 2)
  })

  it("fails only when the retry also times out", async () => {
    const read = scripted<Answer>([never])
    await assert.rejects(
      readWithRetry(read, { timeoutMs: 5, retries: 1 }),
      ReadTimeoutError
    )
    assert.equal(read.calls, 2)
  })

  it("does not retry an answer that says ok: false", async () => {
    const read = scripted<Answer>([
      () => after<Answer>(1, { ok: false, error: "That is not a bus stop." }),
    ])
    const result = await readWithRetry(read, { timeoutMs: 50, retries: 1 })
    assert.equal(result.ok, false)
    assert.equal(read.calls, 1)
  })

  it("does not retry a poll", async () => {
    const read = scripted<Answer>([never])
    await assert.rejects(
      readWithRetry(read, { timeoutMs: 5, retries: 0 }),
      ReadTimeoutError
    )
    assert.equal(read.calls, 1)
  })
})

describe("keepHeldOnFailure", () => {
  const failed = { id: "A", state: { status: "error" } }

  it("keeps rows already shown for the same stop", () => {
    const held = { id: "A", state: { status: "ok" } }
    assert.equal(keepHeldOnFailure(held, "A", failed), held)
  })

  it("does not keep another stop's rows", () => {
    const held = { id: "B", state: { status: "ok" } }
    assert.equal(keepHeldOnFailure(held, "A", failed), failed)
  })

  it("shows the failure when nothing good is held", () => {
    assert.equal(keepHeldOnFailure(null, "A", failed), failed)
    assert.equal(keepHeldOnFailure({ id: "A", state: { status: "loading" } }, "A", failed), failed)
  })
})
