import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  DOCS_SIDEBAR_TRIGGER_PX,
  SITE_NAV_BREAKPOINTS,
  estimateDocsMobileHeaderRowWidth,
  estimateMobileHeaderRowWidth,
} from "./site-nav"
import { getDocsEntryForPathname } from "./docs-catalog"

describe("docs mobile sidebar trigger position", () => {
  it("keeps a compact trigger on the same header row as the wordmark", () => {
    assert.ok(estimateDocsMobileHeaderRowWidth() <= SITE_NAV_BREAKPOINTS.mobile)
    assert.ok(
      estimateMobileHeaderRowWidth({
        docsSidebarTriggerPx: DOCS_SIDEBAR_TRIGGER_PX,
      }) <= SITE_NAV_BREAKPOINTS.mobile
    )
  })

  it("resolves docs pathnames to the catalogue entry the persistent toolbar shows", () => {
    assert.equal(getDocsEntryForPathname("/docs")?.slug, "introduction")
    assert.equal(
      getDocsEntryForPathname("/docs/explorer/lines/tube-rail/victoria")?.slug,
      "explore-index"
    )
    assert.equal(
      getDocsEntryForPathname("/docs/line-topology/junctions")?.slug,
      "line-topology"
    )
  })
})
