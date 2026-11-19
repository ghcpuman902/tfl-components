import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { domainRedirectHosts, domainRedirects } from "./domain-redirect"
import { SITE_URL } from "./site"

describe("domain redirect", () => {
  it("is off without DOMAIN_REDIRECT=1", () => {
    assert.deepEqual(domainRedirects({}), [])
    assert.deepEqual(domainRedirects({ DOMAIN_REDIRECT: "0" }), [])
    assert.deepEqual(
      domainRedirects({ DOMAIN_REDIRECT_HOSTS: "a.vercel.app" }),
      []
    )
  })

  it("301s the legacy host to the same path on the canonical origin", () => {
    const [rule, ...rest] = domainRedirects({ DOMAIN_REDIRECT: "1" })
    assert.equal(rest.length, 0)
    assert.equal(SITE_URL, "https://tfl-ts.dev")
    assert.deepEqual(rule, {
      source: "/:path*",
      has: [{ type: "host", value: "tfl.manglekuo.com" }],
      destination: "https://tfl-ts.dev/:path*",
      statusCode: 301,
    })
  })

  it("adds rehearsal hosts but never redirects the canonical host", () => {
    assert.deepEqual(
      domainRedirectHosts({
        DOMAIN_REDIRECT: "1",
        DOMAIN_REDIRECT_HOSTS: " Preview-Alias.vercel.app ,tfl-ts.dev,",
      }),
      ["tfl.manglekuo.com", "preview-alias.vercel.app"]
    )
  })
})
