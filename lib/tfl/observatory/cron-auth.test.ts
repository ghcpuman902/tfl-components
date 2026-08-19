import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isObservatoryCronAuthorized } from "@/lib/tfl/observatory/cron-auth"

describe("isObservatoryCronAuthorized", () => {
  it("rejects when CRON_SECRET is unset", () => {
    const previous = process.env.CRON_SECRET
    delete process.env.CRON_SECRET
    const allowed = isObservatoryCronAuthorized(
      new Request("http://localhost/api/cron/tfl-metadata", {
        headers: { authorization: "Bearer test" },
      })
    )
    if (previous === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previous
    assert.equal(allowed, false)
  })

  it("accepts a matching bearer token", () => {
    const previous = process.env.CRON_SECRET
    process.env.CRON_SECRET = "observatory-test-secret"
    const allowed = isObservatoryCronAuthorized(
      new Request("http://localhost/api/cron/tfl-metadata", {
        headers: { authorization: "Bearer observatory-test-secret" },
      })
    )
    if (previous === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previous
    assert.equal(allowed, true)
  })
})
