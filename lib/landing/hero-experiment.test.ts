import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { NextRequest } from "next/server"
import { proxy } from "../../proxy"
import {
  HERO_COOKIE_MAX_AGE_SECONDS,
  HERO_EVENT_NAMES,
  HERO_VARIANT_COOKIE,
  HERO_VARIANT_IDS,
  heroVariantCookieString,
  heroVariantForVisitor,
  parseHeroVariant,
  readHeroVariantCookie,
} from "@/lib/landing/hero-experiment"
import {
  assignHero,
  decodeHeroCode,
  heroStaticCodes,
} from "@/lib/landing/hero-precompute"
import { ANALYTICS_EVENT_NAMES } from "@/lib/analytics/events"
import { redactAnalyticsProps } from "@/lib/analytics/redact"

const root = dirname(fileURLToPath(import.meta.url))
const read = (relative: string) => readFileSync(join(root, relative), "utf8")

const request = (url: string, cookie?: string, userAgent = "Mozilla/5.0") => {
  const headers = new Headers({ "user-agent": userAgent })
  if (cookie) headers.set("cookie", cookie)
  return {
    headers,
    nextUrl: { searchParams: new URL(url).searchParams },
    cookies: {
      get: (name: string) => {
        const pair = cookie
          ?.split(";")
          .map((part) => part.trim().split("="))
          .find(([key]) => key === name)
        return pair ? { value: pair[1]! } : undefined
      },
    },
  }
}

describe("hero assignment", () => {
  it("is deterministic and splits visitors into roughly equal thirds", () => {
    const counts = { a: 0, b: 0, c: 0 }
    for (let index = 0; index < 6000; index += 1) {
      const id = `visitor-${index}`
      const variant = heroVariantForVisitor(id)
      assert.equal(variant, heroVariantForVisitor(id))
      counts[variant] += 1
    }
    for (const variant of HERO_VARIANT_IDS) {
      assert.ok(
        counts[variant] > 1800 && counts[variant] < 2200,
        `${variant}: ${counts[variant]}`
      )
    }
  })

  it("mints a visitor id once and keeps the variant sticky after", async () => {
    const first = await assignHero(request("https://tfl.test/"))
    assert.ok(first.newVisitorId)
    assert.equal(first.counted, true)
    const again = await assignHero(
      request("https://tfl.test/", `tfl_hero_vid=${first.newVisitorId}`)
    )
    assert.equal(again.newVisitorId, null)
    assert.equal(again.variant, first.variant)
    assert.equal(again.code, first.code)
  })

  it("?hero= forces a variant, is not counted and sets no cookie", async () => {
    for (const forced of HERO_VARIANT_IDS) {
      const visit = await assignHero(
        request(`https://tfl.test/?hero=${forced}`, "tfl_hero_vid=someone")
      )
      assert.equal(visit.variant, forced)
      assert.equal(visit.counted, false)
      assert.equal(visit.newVisitorId, null)
      assert.deepEqual(await decodeHeroCode(visit.code), {
        variant: forced,
        counted: false,
      })
    }
    const junk = await assignHero(request("https://tfl.test/?hero=z"))
    assert.equal(junk.counted, true)
  })

  it("serves crawlers the control, uncounted, without a cookie", async () => {
    const bot = await assignHero(
      request("https://tfl.test/", undefined, "Googlebot/2.1")
    )
    assert.equal(bot.variant, "a")
    assert.equal(bot.counted, false)
    assert.equal(bot.newVisitorId, null)
  })

  it("only ever produces codes that are prerendered, and rejects forged ones", async () => {
    const codes = await heroStaticCodes()
    assert.equal(codes.length, HERO_VARIANT_IDS.length * 2)
    for (const id of ["x1", "x2", "x3", "x4"]) {
      const visit = await assignHero(
        request("https://tfl.test/", `tfl_hero_vid=${id}`)
      )
      assert.ok(codes.includes(visit.code))
    }
    await assert.rejects(decodeHeroCode("forged"))
  })
})

describe("hero cookies", () => {
  it("round-trips the variant cookie and ignores junk", () => {
    assert.equal(parseHeroVariant("b"), "b")
    assert.equal(parseHeroVariant("room"), null)
    assert.equal(
      readHeroVariantCookie(`x=1; ${HERO_VARIANT_COOKIE}=c; y=2`),
      "c"
    )
    assert.equal(readHeroVariantCookie(`${HERO_VARIANT_COOKIE}=zzz`), null)
    assert.equal(readHeroVariantCookie(null), null)
    const cookie = heroVariantCookieString("a", true)
    assert.match(cookie, new RegExp(`Max-Age=${HERO_COOKIE_MAX_AGE_SECONDS}`))
    assert.match(cookie, /Secure/)
    assert.doesNotMatch(heroVariantCookieString("a", false), /Secure/)
  })
})

describe("hero events", () => {
  it("registers the three short names and lets only variant through", () => {
    assert.deepEqual(
      [...HERO_EVENT_NAMES],
      ["hero_view", "hero_cta", "board_made"]
    )
    for (const name of HERO_EVENT_NAMES) {
      assert.ok((ANALYTICS_EVENT_NAMES as readonly string[]).includes(name))
    }
    assert.deepEqual(redactAnalyticsProps({ variant: "b" }), { variant: "b" })
  })

  it("sends through the redacting wrapper, never straight to Vercel", () => {
    const track = read("../analytics/track.ts")
    assert.match(track, /export const trackHeroEvent/)
    assert.match(track, /dispatch\(name, \{ variant \}\)/)
    assert.match(track, /vercelTrack\(name, safe\)/)
    for (const file of [
      "../../components/landing/landing-analytics.tsx",
      "../../components/landing/landing-room-variant.tsx",
      "../../components/board/board-staged-builder.tsx",
    ]) {
      assert.doesNotMatch(read(file), /@vercel\/analytics/, file)
    }
  })

  it("fires hero_view only for counted views and marks exposure then", () => {
    const analytics = read("../../components/landing/landing-analytics.tsx")
    assert.match(
      analytics,
      /if \(hero\?\.counted\) \{\s*markHeroExposure\(hero\.variant\)\s*trackHeroEvent\("hero_view", hero\.variant\)/
    )
    assert.match(analytics, /sent\.current/)
  })

  it("fires hero_cta on the Make my Board click, counted views only", () => {
    const variant = read("../../components/landing/landing-room-variant.tsx")
    assert.match(
      variant,
      /if \(hero\.counted\) trackHeroEvent\("hero_cta", hero\.variant\)/
    )
  })

  it("fires board_made on first completion from the exposure cookie", () => {
    const builder = read("../../components/board/board-staged-builder.tsx")
    assert.match(
      builder,
      /if \(firstCompletion\) \{[\s\S]*board_setup_completed[\s\S]*readExposedHeroVariant\(\)[\s\S]*trackHeroEvent\("board_made", heroVariant\)/
    )
  })
})

describe("static permutation wiring", () => {
  it("rewrites the homepage in the proxy and keeps cookie options private", () => {
    const source = read("../../proxy.ts")
    assert.match(source, /NextResponse\.rewrite\(url\)/)
    assert.match(source, /\$\{HERO_AB_PATH\}\/\$\{assignment\.code\}/)
    assert.match(source, /httpOnly: true/)
    assert.match(source, /markdown/)
  })

  it("prerenders every permutation and 404s unknown codes", () => {
    const page = read("../../app/hero-ab/[code]/page.tsx")
    assert.match(page, /generateStaticParams/)
    assert.match(page, /heroStaticCodes\(\)/)
    assert.match(page, /notFound\(\)/)
    assert.doesNotMatch(page, /searchParams|cookies\(|headers\(/)
  })

  it("keeps secrets and non-flags out of the flags discovery module", () => {
    const flags = read("../../flags.ts")
    assert.doesNotMatch(flags, /FLAGS_SECRET/)
    assert.deepEqual(
      [...flags.matchAll(/^export const (\w+)/gm)].map((match) => match[1]),
      ["heroVariantFlag", "heroCountedFlag"]
    )
  })
})

describe("proxy homepage rewrite", () => {
  const get = (url: string, headers: Record<string, string> = {}) =>
    proxy(
      new NextRequest(url, {
        headers: { "user-agent": "Mozilla/5.0", ...headers },
      })
    )
  const target = (response: Response) =>
    response.headers.get("x-middleware-rewrite") ?? ""
  const visitorId = (response: Response) =>
    /tfl_hero_vid=([\w-]+)/.exec(response.headers.get("set-cookie") ?? "")?.[1]

  it("rewrites an HTML visit to a permutation and sets the visitor cookie once", async () => {
    const response = await get("http://localhost/", { accept: "text/html" })
    assert.match(target(response), /\/hero-ab\/[\w.-]+$/)
    assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/i)
    assert.match(response.headers.get("link") ?? "", /text\/markdown/)

    const id = visitorId(response)
    assert.ok(id)
    const again = await get("http://localhost/", {
      accept: "text/html",
      cookie: `tfl_hero_vid=${id}`,
    })
    assert.equal(target(again), target(response))
    assert.equal(again.headers.get("set-cookie"), null)
  })

  it("also rewrites client navigation (RSC), to the same permutation", async () => {
    const html = await get("http://localhost/", {
      accept: "text/html",
      cookie: "tfl_hero_vid=abc",
    })
    const rsc = await get("http://localhost/?_rsc=1x", {
      accept: "text/x-component",
      rsc: "1",
      cookie: "tfl_hero_vid=abc",
    })
    assert.equal(target(rsc).replace(/\?.*/, ""), target(html))
  })

  it("keeps ?hero= out of the cookie jar", async () => {
    const response = await get("http://localhost/?hero=b", {
      accept: "text/html",
    })
    assert.match(target(response), /\/hero-ab\//)
    assert.equal(response.headers.get("set-cookie"), null)
  })

  it("still serves Markdown to agents and 406 to the unacceptable", async () => {
    const markdown = await get("http://localhost/", { accept: "text/markdown" })
    assert.equal(markdown.status, 200)
    assert.equal(target(markdown), "")
    assert.match(markdown.headers.get("content-type") ?? "", /markdown/)
    const refused = await get("http://localhost/", { accept: "image/png" })
    assert.equal(refused.status, 406)
  })

  it("leaves other routes alone", async () => {
    const response = await get("http://localhost/board", {
      accept: "text/html",
    })
    assert.equal(target(response), "")
    assert.equal(response.headers.get("set-cookie"), null)
  })
})
