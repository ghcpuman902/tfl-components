import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { redactAnalyticsProps } from "./redact"

describe("analytics redaction", () => {
  it("keeps allowed properties and drops keys, coordinates, searches, and PII", () => {
    const key = "abcdef0123456789abcdef0123456789"
    const redacted = redactAnalyticsProps(
      {
        experimentVersion: "v1",
        variant: "simple",
        deviceClass: "desktop",
        viewportCategory: "desktop",
        referrerCategory: "direct",
        stage: 2,
        locationUsed: true,
        stopSelected: true,
        keyMode: "own",
        key,
        appKey: key,
        lat: 51.515,
        lon: -0.141,
        query: "oxford circus",
        email: "person@example.com",
        href: `https://tfl.manglekuo.com/board/view#stop=940GZZLUOXC&key=${key}`,
      },
      [key]
    )

    assert.equal(redacted.variant, "simple")
    assert.equal(redacted.stage, 2)
    assert.equal(redacted.keyMode, "own")
    assert.equal("key" in redacted, false)
    assert.equal("appKey" in redacted, false)
    assert.equal("lat" in redacted, false)
    assert.equal("lon" in redacted, false)
    assert.equal("query" in redacted, false)
    assert.equal("email" in redacted, false)
    assert.equal("href" in redacted, false)
  })

  it("redacts credentialed URLs if a string slips through", () => {
    const key = "secretkeyvalue"
    const redacted = redactAnalyticsProps(
      {
        experimentVersion: `https://example.com/board/view#key=${key}`,
        variant: "room",
        deviceClass: "mobile",
        viewportCategory: "phone",
        referrerCategory: "internal",
      },
      [key]
    )
    assert.match(String(redacted.experimentVersion), /•••/)
    assert.doesNotMatch(String(redacted.experimentVersion), /secretkeyvalue/)
  })
})
