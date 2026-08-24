import assert from "node:assert/strict"
import test from "node:test"
import { GET as getCatalog } from "@/app/api/catalog/route"
import { GET as getLlms } from "@/app/llms.txt/route"
import { GET as getOpenApi } from "@/app/openapi.json/route"
import robots from "@/app/robots"
import sitemap from "@/app/sitemap"
import { apiErrorBody, methodNotAllowed } from "@/lib/agent/api-response"
import { NextRequest } from "next/server"
import {
  hasUnknownTopLevelPath,
  isHomepageRepresentationRequest,
  isPublicStaticAsset,
  mergeVary,
  negotiateHomepageContent,
} from "@/lib/agent/content-negotiation"
import { proxy } from "@/proxy"
import {
  HOME_MARKDOWN,
  LLMS_TEXT,
  markdownNotFound,
} from "@/lib/agent/machine-content"
import { OPENAPI_DOCUMENT } from "@/lib/agent/openapi"
import { getPublicCatalog } from "@/lib/agent/site-catalog"
import {
  serialiseStructuredData,
  SITE_STRUCTURED_DATA,
} from "@/lib/agent/structured-data"

test("homepage negotiation honours media types and q-values", () => {
  assert.equal(negotiateHomepageContent(null), "html")
  assert.equal(negotiateHomepageContent("*/*"), "html")
  assert.equal(negotiateHomepageContent("text/markdown"), "markdown")
  assert.equal(
    negotiateHomepageContent("text/markdown, text/html;q=0.8"),
    "markdown"
  )
  assert.equal(
    negotiateHomepageContent("text/markdown;q=0.2, text/html;q=0.9"),
    "html"
  )
  assert.equal(
    negotiateHomepageContent("text/*;q=0.5, text/html;q=0.9"),
    "html"
  )
  assert.equal(negotiateHomepageContent("application/json"), "not-acceptable")
  assert.equal(negotiateHomepageContent("text/markdown;q=0"), "not-acceptable")
})

test("Vary values are merged without losing Next.js fields", () => {
  assert.equal(
    mergeVary("rsc, next-router-state-tree", "Accept"),
    "rsc, next-router-state-tree, Accept"
  )
  assert.equal(mergeVary("accept", "Accept"), "Accept")
})

test("homepage negotiation leaves React and non-document requests alone", () => {
  assert.equal(isHomepageRepresentationRequest("GET", "text/html", null), true)
  assert.equal(
    isHomepageRepresentationRequest("GET", "text/markdown", "document"),
    true
  )
  assert.equal(
    isHomepageRepresentationRequest("GET", "text/x-component", null),
    false
  )
  assert.equal(isHomepageRepresentationRequest("GET", "*/*", "empty"), false)
  assert.equal(isHomepageRepresentationRequest("POST", "*/*", null), false)
})

test("Markdown 404 routing is conservative and recoverable", () => {
  assert.equal(hasUnknownTopLevelPath("/missing-page"), true)
  assert.equal(hasUnknownTopLevelPath("/docs/missing-page"), false)
  assert.equal(hasUnknownTopLevelPath("/api/catalog"), false)
  assert.equal(hasUnknownTopLevelPath("/about"), false)
  assert.equal(hasUnknownTopLevelPath("/privacy"), false)
  assert.equal(hasUnknownTopLevelPath("/google3280ccf112e8b472.html"), false)
  assert.equal(hasUnknownTopLevelPath("/images/home/thames-foreshore.jpg"), false)
  const body = markdownNotFound("/missing-page")
  assert.match(body, /^# 404: Page not found/m)
  assert.match(body, /\/llms\.txt/)
  assert.match(body, /\/sitemap\.xml/)
  assert.match(body, /\/docs/)
})

test("homepage and llms.txt contain substantial, task-oriented Markdown", () => {
  assert.ok(HOME_MARKDOWN.length >= 500)
  assert.match(HOME_MARKDOWN, /^# tfl-components\n\n>/)
  assert.match(HOME_MARKDOWN, /iPad/)
  assert.match(HOME_MARKDOWN, /tfl-ts/)
  assert.match(HOME_MARKDOWN, /command-line tool/)

  assert.match(LLMS_TEXT, /^# tfl-components\n\n>/)
  assert.match(LLMS_TEXT, /Use this site when/)
  assert.match(LLMS_TEXT, /## Best starting points/)
  assert.match(LLMS_TEXT, /## Machine-readable resources/)
  assert.match(LLMS_TEXT, /npx -y tfl-ts@latest mcp/)
  assert.match(LLMS_TEXT, /\/openapi\.json/)
})

test("public catalogue describes the existing product routes", () => {
  const catalog = getPublicCatalog()
  assert.equal(catalog.meta.apiVersion, "1.0.0")
  assert.deepEqual(
    catalog.data.products.map((product) => product.id),
    ["board", "tfl-components", "tfl-ts"]
  )
  const tflTs = catalog.data.products.find((product) => product.id === "tfl-ts")
  assert.ok(tflTs && "commands" in tflTs)
  assert.match(tflTs.commands.mcp, /tfl-ts@latest mcp/)
  assert.ok(catalog.data.components.length >= 5)
  assert.ok(
    catalog.data.components.every(
      (component) => component.registryUrl && component.documentationUrl
    )
  )
})

test("OpenAPI operations are self-describing and function-call compatible", () => {
  assert.equal(OPENAPI_DOCUMENT.openapi, "3.1.0")
  const operations = Object.values(OPENAPI_DOCUMENT.paths).map(
    (path) => path.get
  )
  const operationIds = operations.map((operation) => operation.operationId)
  assert.equal(new Set(operationIds).size, operationIds.length)
  for (const operation of operations) {
    assert.ok(operation.operationId.length > 0)
    assert.ok(operation.description.length > 20)
    assert.ok(operation.responses["200"])
  }
  const registryOperation = OPENAPI_DOCUMENT.paths["/api/registry/{name}"].get
  assert.equal(registryOperation.parameters[0].required, true)
  assert.equal(registryOperation.parameters[0].schema.type, "string")
  assert.ok(OPENAPI_DOCUMENT.components.schemas.ApiError)
  assert.ok(OPENAPI_DOCUMENT.components.schemas.CatalogResponse)
})

test("API errors have stable codes, messages, hints, and JSON responses", async () => {
  assert.deepEqual(
    apiErrorBody("NOT_FOUND", "Missing.", "Read the catalogue."),
    {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Missing.",
        resolution: "Read the catalogue.",
      },
    }
  )
  const response = methodNotAllowed(["GET"])
  assert.equal(response.status, 405)
  assert.equal(response.headers.get("content-type"), "application/json")
  assert.equal(response.headers.get("allow"), "GET")
  const body = (await response.json()) as { error: { code: string } }
  assert.equal(body.error.code, "METHOD_NOT_ALLOWED")
})

test("machine-readable route handlers return the declared formats", async () => {
  const llmsResponse = getLlms()
  assert.equal(llmsResponse.status, 200)
  assert.equal(
    llmsResponse.headers.get("content-type"),
    "text/markdown; charset=utf-8"
  )
  assert.match(llmsResponse.headers.get("link") ?? "", /rel="describedby"/)

  const catalogResponse = getCatalog()
  assert.equal(catalogResponse.status, 200)
  assert.equal(catalogResponse.headers.get("access-control-allow-origin"), "*")
  const body = (await catalogResponse.json()) as { data: { name: string } }
  assert.equal(body.data.name, "tfl-components")

  const openApiResponse = getOpenApi()
  assert.equal(openApiResponse.status, 200)
  assert.equal(openApiResponse.headers.get("access-control-allow-origin"), "*")
  assert.equal(
    openApiResponse.headers.get("content-type"),
    "application/json; charset=utf-8"
  )
})

test("structured data identifies the real project without a fabricated organisation", () => {
  const types = SITE_STRUCTURED_DATA["@graph"].map((node) => node["@type"])
  assert.ok(types.includes("WebSite"))
  assert.ok(types.includes("SoftwareApplication"))
  assert.ok(types.includes("SoftwareSourceCode"))
  assert.ok(types.includes("Person"))
  assert.ok(!types.includes("Organization"))
  assert.doesNotThrow(() =>
    JSON.parse(serialiseStructuredData(SITE_STRUCTURED_DATA))
  )
})

test("public static assets skip proxy negotiation, registry JSON does not", () => {
  assert.equal(isPublicStaticAsset("/google3280ccf112e8b472.html"), true)
  assert.equal(isPublicStaticAsset("/images/home/thames-foreshore.jpg"), true)
  assert.equal(isPublicStaticAsset("/r/line-badge.json"), false)
  assert.equal(isPublicStaticAsset("/missing-page"), false)

  const verification = proxy(
    new NextRequest("http://localhost/google3280ccf112e8b472.html", {
      headers: { accept: "text/markdown" },
    })
  )
  assert.equal(verification.status, 200)
  assert.equal(verification.headers.get("x-middleware-next"), "1")

  const registry = proxy(new NextRequest("http://localhost/r/line-badge.json"))
  assert.match(
    registry.headers.get("x-middleware-rewrite") ?? "",
    /\/api\/registry\/line-badge$/
  )
})

test("sitemap and robots expose trust pages and public APIs", () => {
  const urls = sitemap().map((entry) => entry.url)
  assert.ok(urls.some((url) => url.endsWith("/about")))
  assert.ok(urls.some((url) => url.endsWith("/contact")))
  assert.ok(urls.some((url) => url.endsWith("/privacy")))

  const rules = robots().rules
  assert.ok(!Array.isArray(rules))
  assert.ok(Array.isArray(rules.allow))
  assert.ok(rules.allow.includes("/api/catalog"))
  assert.ok(rules.allow.includes("/api/registry/"))
})
