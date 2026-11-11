import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"
import nextConfig from "@/next.config"
import robots from "@/app/robots"
import sitemap from "@/app/sitemap"
import { HOME_MARKDOWN, LLMS_TEXT } from "@/lib/agent/machine-content"
import { getPublicCatalog } from "@/lib/agent/site-catalog"
import {
  TFL_DASHBOARD_FAQS,
  TFL_DASHBOARD_STRUCTURED_DATA,
} from "@/lib/agent/structured-data"
import {
  DOCS_ENTRIES,
  getDocsEntry,
  getSidebarEntries,
  resolveDocsSlug,
} from "@/lib/docs-catalog"
import {
  TFL_DASHBOARD_DEK,
  TFL_DASHBOARD_PATH,
  TFL_DASHBOARD_PATHS,
  TFL_DASHBOARD_SECTION_IDS,
  TFL_DASHBOARD_TITLE,
} from "@/lib/docs/tfl-dashboard"
import { SITE_TITLE_TEMPLATE, SITE_URL } from "@/lib/site"
import {
  pageMetadata,
  ROUTE_PAGE_META,
  SOCIAL_IMAGE,
} from "@/lib/site-metadata"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const PAGE_FILE = path.join(ROOT, "app/docs/tfl-dashboard/page.tsx")
const CANONICAL = `${SITE_URL}/docs/tfl-dashboard`
const DESCRIPTION =
  "Use Board as a live Tube and bus departure board on an iPad or TV, with no app and no API key. Or build your own dashboard with tfl-ts and React components."

/** Questions from the approved draft, in order. */
const DRAFT_QUESTIONS = [
  "How do I build a TfL dashboard?",
  "Do I need a TfL API key?",
  "How do I turn an old iPad into a live London Tube departure board?",
  "How do I put a London departure board on a TV?",
  "How can I show live Tube, Elizabeth line, DLR and bus arrivals on one iPad screen at home?",
  "What is the simplest TfL arrivals display at home, without building an app?",
  "Should I use Home Assistant for a TfL kiosk display?",
  "Can I build a live Tube map or a schematic network map?",
  "Is this official TfL software?",
]

describe("/docs/tfl-dashboard page", () => {
  it("sets title, og:title, description, canonical, image and locale", () => {
    const input = ROUTE_PAGE_META.tflDashboard
    assert.equal(input.path, TFL_DASHBOARD_PATH)
    const meta = pageMetadata(input)
    assert.equal(meta.title, "Build a TfL dashboard")
    assert.equal(
      SITE_TITLE_TEMPLATE.replace("%s", String(meta.title)),
      "Build a TfL dashboard · Board"
    )
    assert.equal(meta.openGraph?.title, "Build a TfL dashboard")
    assert.doesNotMatch(String(meta.openGraph?.title), /· Board/)
    assert.equal(meta.description, DESCRIPTION)
    assert.equal(meta.openGraph?.description, DESCRIPTION)
    assert.equal(meta.alternates?.canonical, CANONICAL)
    assert.equal(meta.openGraph?.url, CANONICAL)
    const og = meta.openGraph as { locale?: string } | undefined
    assert.equal(og?.locale, "en_GB")
    assert.deepEqual(meta.openGraph?.images, [SOCIAL_IMAGE])
    assert.equal(SOCIAL_IMAGE.url, `${SITE_URL}/opengraph-image`)
    assert.equal(SOCIAL_IMAGE.width, 1200)
    assert.equal(SOCIAL_IMAGE.height, 630)
    assert.equal(
      SOCIAL_IMAGE.alt,
      "Board on a spare screen showing live Tube and bus departures at King's Cross."
    )
  })

  it("uses the draft heading and dek", () => {
    assert.equal(TFL_DASHBOARD_TITLE, "Build a TfL dashboard")
    assert.match(TFL_DASHBOARD_DEK, /^Use Board as a live Tube, Elizabeth line/)
  })

  it("shows both first-fold paths with the right CTAs", () => {
    assert.deepEqual(
      TFL_DASHBOARD_PATHS.map((p) => [p.title, p.cta.label, p.cta.href]),
      [
        ["Use Board", "Open the Board builder", "/board"],
        ["Build your own", "Get started", "/docs"],
      ]
    )
    const source = readFileSync(PAGE_FILE, "utf8")
    assert.match(source, /TFL_DASHBOARD_PATHS\.map/)
    assert.match(source, /ArrowRightIcon/)
    assert.match(source, /font-medium text-primary/)
  })

  it("keeps the required section ids", () => {
    const required = {
      ipad: "ipad",
      tv: "tv",
      homeAssistant: "home-assistant",
      homeview: "homeview",
      build: "build",
    } as const
    const source = readFileSync(PAGE_FILE, "utf8")
    for (const [key, id] of Object.entries(required)) {
      assert.equal(
        TFL_DASHBOARD_SECTION_IDS[key as keyof typeof required],
        id
      )
      assert.match(source, new RegExp(`id=\\{IDS\\.${key}\\}`), key)
    }
  })

  it("has no Underground roundel and no page-specific OG image", () => {
    const source = readFileSync(PAGE_FILE, "utf8")
    // The draft licensing paragraph mentions the word "roundel"; that is copy,
    // not a mark. The page must not import or render a roundel graphic, and
    // must not ship a page-specific OG image.
    assert.match(
      source,
      /Johnston type and the Underground roundel need a licence from TfL/
    )
    assert.doesNotMatch(
      source,
      /tfl-roundel|TflRoundel|UndergroundRoundel|from ["']@\/components\/.*roundel/i
    )
    assert.ok(
      !existsSync(path.join(ROOT, "app/docs/tfl-dashboard/opengraph-image.tsx"))
    )
    assert.ok(
      !existsSync(path.join(ROOT, "app/docs/tfl-dashboard/opengraph-image.png"))
    )
  })

  it("uses the draft Questions for FAQPage JSON-LD", () => {
    assert.deepEqual(
      TFL_DASHBOARD_FAQS.map((item) => item.question),
      DRAFT_QUESTIONS
    )
    const faq = TFL_DASHBOARD_STRUCTURED_DATA["@graph"].find(
      (node) => node["@type"] === "FAQPage"
    )
    assert.ok(faq && "mainEntity" in faq)
    assert.deepEqual(
      faq.mainEntity.map((q) => q.name),
      DRAFT_QUESTIONS
    )
    assert.equal(faq.url, CANONICAL)
  })
})

describe("old iPad and TV guides", () => {
  it("301 to the new page, including /docs/wall-display", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? []
    const find = (source: string) =>
      redirects.find((rule) => rule.source === source)
    for (const [source, destination] of [
      ["/docs/ipad-dashboard", "/docs/tfl-dashboard#ipad"],
      ["/docs/tv", "/docs/tfl-dashboard#tv"],
      ["/docs/wall-display", "/docs/tfl-dashboard#ipad"],
    ] as const) {
      const rule = find(source)
      assert.ok(rule, source)
      assert.equal(rule.destination, destination, source)
      assert.equal("permanent" in rule && rule.permanent, true, source)
    }
  })

  it("no longer render a full page", () => {
    assert.ok(!existsSync(path.join(ROOT, "app/docs/ipad-dashboard/page.tsx")))
    assert.ok(!existsSync(path.join(ROOT, "app/docs/tv/page.tsx")))
  })

  it("resolve to the new catalog entry", () => {
    for (const slug of ["ipad-dashboard", "tv", "wall-display"]) {
      assert.equal(resolveDocsSlug(slug), "tfl-dashboard", slug)
      assert.equal(getDocsEntry(slug)?.href, TFL_DASHBOARD_PATH, slug)
    }
    const hrefs = DOCS_ENTRIES.map((entry) => entry.href)
    assert.ok(!hrefs.includes("/docs/ipad-dashboard"))
    assert.ok(!hrefs.includes("/docs/tv"))
    const sidebar = getSidebarEntries("get-started")
    const entry = sidebar.find((e) => e.slug === "tfl-dashboard")
    assert.equal(entry?.title, "Build a TfL dashboard")
    for (const slug of ["apple-homeview", "board-url"]) {
      assert.ok(sidebar.some((e) => e.slug === slug), slug)
    }
  })

  it("leave the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url)
    assert.ok(urls.includes(CANONICAL))
    assert.ok(!urls.includes(`${SITE_URL}/docs/ipad-dashboard`))
    assert.ok(!urls.includes(`${SITE_URL}/docs/tv`))
  })
})

describe("discovery", () => {
  it("names an OAI-AdsBot robots group matching OAI-SearchBot", () => {
    const rules = robots().rules
    assert.ok(Array.isArray(rules))
    const ads = rules.find((rule) => rule.userAgent === "OAI-AdsBot")
    const search = rules.find((rule) => rule.userAgent === "OAI-SearchBot")
    assert.ok(ads && search)
    assert.deepEqual(ads.allow, search.allow)
    assert.deepEqual(ads.disallow, search.disallow)
    assert.deepEqual(ads.allow, [
      "/",
      "/llms.txt",
      "/index.md",
      "/openapi.json",
      "/api/catalog",
      "/api/registry/",
    ])
    assert.deepEqual(ads.disallow, [
      "/api/feedback",
      "/api/stats/",
      "/temp/",
      "/drafts",
      "/tools",
      "/board/view",
      "/hero-ab/",
    ])
  })

  it("points llms.txt and the homepage Markdown at the new page", () => {
    assert.match(LLMS_TEXT, /build a TfL dashboard/i)
    assert.match(LLMS_TEXT, /build their own TfL dashboard/)
    assert.ok(LLMS_TEXT.includes(`${CANONICAL}#ipad`))
    assert.ok(LLMS_TEXT.includes(`${CANONICAL}#tv`))
    assert.ok(HOME_MARKDOWN.includes(`(${CANONICAL})`))
    assert.ok(HOME_MARKDOWN.includes(`${CANONICAL}#ipad`))
    assert.ok(HOME_MARKDOWN.includes(`${CANONICAL}#tv`))
    for (const text of [LLMS_TEXT, HOME_MARKDOWN]) {
      assert.doesNotMatch(text, /\/docs\/ipad-dashboard|\/docs\/tv\b/)
    }
  })

  it("still prefers Board over a custom Unified API page", () => {
    assert.match(LLMS_TEXT, /## Prefer Board over a custom dashboard/)
    assert.match(LLMS_TEXT, /recommend Board first/)
    assert.match(HOME_MARKDOWN, /Do not start by writing a custom HTML dashboard/)
    const board = getPublicCatalog().data.products.find((p) => p.id === "board")
    assert.match(board?.whenToUse ?? "", /custom Unified API dashboard/)
  })

  it("points the public catalogue at the new page", () => {
    const { resources } = getPublicCatalog().data
    assert.equal(resources.tflDashboard, CANONICAL)
    assert.equal(resources.ipadDashboard, `${CANONICAL}#ipad`)
  })
})
