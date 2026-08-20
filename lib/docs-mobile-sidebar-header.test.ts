import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import {
  DOCS_SIDEBAR_TRIGGER_LABEL,
  DOCS_SIDEBAR_TRIGGER_PX,
  SITE_NAV_BREAKPOINTS,
  estimateDocsMobileHeaderRowWidth,
  estimateMobileHeaderRowWidth,
} from "./site-nav"

const root = dirname(fileURLToPath(import.meta.url))

const read = (relative: string) =>
  readFileSync(join(root, relative), "utf8")

describe("docs mobile sidebar trigger position", () => {
  const header = read("../components/site-header.tsx")
  const chrome = read("../components/docs/app-chrome.tsx")

  it("lives in the global header, left of the logo, never under the header", () => {
    assert.match(header, /docsNav/)
    assert.match(header, /SidebarTrigger/)
    assert.match(header, /flex-nowrap/)
    assert.match(header, /size-11 min-h-11 min-w-11/)
    assert.match(header, /md:hidden/)
    assert.match(header, /DOCS_SIDEBAR_TRIGGER_LABEL/)
    assert.equal(DOCS_SIDEBAR_TRIGGER_LABEL, "Open documentation navigation")
    assert.doesNotMatch(chrome, /SidebarTrigger/)
    assert.doesNotMatch(chrome, /Toggle sidebar/)
    assert.doesNotMatch(
      chrome,
      /flex items-center gap-2 border-b border-border px-4 py-2 md:hidden/
    )

    const triggerIndex = header.indexOf("SidebarTrigger")
    const logoIndex = header.indexOf("tfl-components home")
    assert.ok(triggerIndex > 0)
    assert.ok(logoIndex > triggerIndex)
  })

  it("keeps a 44px target on the same 320 and 390 header row as the logo", () => {
    assert.equal(DOCS_SIDEBAR_TRIGGER_PX, 44)
    assert.ok(
      estimateDocsMobileHeaderRowWidth() <= SITE_NAV_BREAKPOINTS.mobileNarrow
    )
    assert.ok(estimateDocsMobileHeaderRowWidth() <= SITE_NAV_BREAKPOINTS.mobile)
    assert.ok(
      estimateMobileHeaderRowWidth({
        wordmarkPx: 0,
        docsSidebarTriggerPx: DOCS_SIDEBAR_TRIGGER_PX,
      }) <= SITE_NAV_BREAKPOINTS.mobileNarrow
    )
  })

  it("does not render the trigger on tablet/desktop header widths", () => {
    assert.match(header, /className="relative z-10 size-11[\s\S]*md:hidden"/)
    assert.equal(SITE_NAV_BREAKPOINTS.tablet, 768)
  })
})
