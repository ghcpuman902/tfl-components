import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildFeedbackHtml,
  buildFeedbackSubject,
  buildFeedbackText,
  escapeHtml,
} from "./email"
import { feedbackFieldsSchema } from "./schema"
import {
  checkSpamSignals,
  checkSubmitTiming,
  countLinks,
  looksLikeSpam,
} from "./spam"
import { isAllowedPageUrl } from "./validate-url"
import { MIN_SUBMIT_MS } from "./constants"

const validFields = {
  kind: "bug",
  message: "The arrivals board clips on narrow widths.",
  email: "",
  pageUrl: "https://tfl.manglekuo.com/docs/arrivals-board",
  pageTitle: "Arrivals board",
  appVersion: "v0.4.0",
  loadedAt: Date.now() - 10_000,
  company_website: "",
}

describe("feedbackFieldsSchema", () => {
  it("accepts a valid submission", () => {
    const result = feedbackFieldsSchema.safeParse(validFields)
    assert.equal(result.success, true)
    if (result.success) {
      assert.equal(result.data.email, undefined)
      assert.equal(result.data.kind, "bug")
    }
  })

  it("accepts an optional follow-up email", () => {
    const result = feedbackFieldsSchema.safeParse({
      ...validFields,
      email: "friend@example.com",
    })
    assert.equal(result.success, true)
    if (result.success) {
      assert.equal(result.data.email, "friend@example.com")
    }
  })

  it("rejects malformed payloads", () => {
    const result = feedbackFieldsSchema.safeParse({
      ...validFields,
      kind: "other",
      message: "",
    })
    assert.equal(result.success, false)
  })

  it("rejects invalid follow-up email", () => {
    const result = feedbackFieldsSchema.safeParse({
      ...validFields,
      email: "not-an-email",
    })
    assert.equal(result.success, false)
  })
})

describe("spam checks", () => {
  it("flags honeypot fills", () => {
    const result = checkSpamSignals({
      honeypot: "http://spam.example",
      loadedAt: Date.now() - 10_000,
      message: "Looks fine",
      nowMs: Date.now(),
    })
    assert.deepEqual(result, { ok: false, reason: "honeypot" })
  })

  it("rejects submissions that are too fast", () => {
    const now = Date.now()
    assert.equal(checkSubmitTiming(now - 500, now), false)
    assert.equal(checkSubmitTiming(now - MIN_SUBMIT_MS, now), true)
    const result = checkSpamSignals({
      honeypot: "",
      loadedAt: now - 100,
      message: "Looks fine",
      nowMs: now,
    })
    assert.deepEqual(result, { ok: false, reason: "too_fast" })
  })

  it("rejects excessive links and gibberish", () => {
    assert.ok(
      countLinks("see http://a.com and https://b.com and www.c.com") >= 3
    )
    assert.equal(
      looksLikeSpam("http://a.com http://b.com http://c.com http://d.com"),
      true
    )
    assert.equal(looksLikeSpam("aaaaaaaaaaaaaaaa"), true)
    assert.equal(looksLikeSpam("Board overlaps the label on mobile."), false)
  })
})

describe("page URL allowlist", () => {
  it("allows same-origin page URLs", () => {
    assert.equal(
      isAllowedPageUrl(
        "https://tfl.manglekuo.com/docs/arrivals-board",
        "https://tfl.manglekuo.com"
      ),
      true
    )
  })

  it("rejects cross-site and non-http URLs", () => {
    assert.equal(
      isAllowedPageUrl(
        "https://evil.example/phish",
        "https://tfl.manglekuo.com"
      ),
      false
    )
    assert.equal(
      isAllowedPageUrl("javascript:alert(1)", "https://tfl.manglekuo.com"),
      false
    )
  })

  it("allows localhost when no origin header is present", () => {
    assert.equal(isAllowedPageUrl("http://localhost:3000/docs", null), true)
  })
})

describe("email formatting", () => {
  it("escapes HTML and builds subject/body", () => {
    assert.equal(
      escapeHtml(`<img src=x onerror="alert(1)">`),
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
    )

    const fields = feedbackFieldsSchema.parse({
      ...validFields,
      message: "Breaks <script>alert(1)</script> on /docs",
      email: "friend@example.com",
    })

    assert.match(buildFeedbackSubject(fields), /Bug report/)
    assert.match(buildFeedbackText(fields), /friend@example.com/)
    assert.match(buildFeedbackHtml(fields), /&lt;script&gt;/)
    assert.doesNotMatch(buildFeedbackHtml(fields), /<script>/)
  })
})
