import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Renderer } from "@takumi-rs/core"
import { LINE_NAME_TIERS } from "@/lib/tfl/line-names"
import { OG_LINE_LABEL_MAP, ogLineLabel } from "@/lib/og/line-label-map"
import {
  OG_LINE_LABEL_SLOTS,
  pickOgLineLabel,
} from "../../scripts/generate-og-line-label-map"

const require = createRequire(import.meta.url)

describe("og line label map", () => {
  it("matches LineName tiers measured at OG chip budgets (no ellipsis)", async () => {
    const helpers = require(
      join(
        process.cwd(),
        "node_modules/.pnpm/@takumi-rs+helpers@2.16.2_react@19.3.1/node_modules/@takumi-rs/helpers/dist/index.cjs"
      )
    )
    // Touch helpers so the generator path stays importable
    assert.equal(typeof helpers.container, "function")

    const renderer = new Renderer()
    await renderer.registerFont({
      data: readFileSync(
        join(
          process.cwd(),
          "assets/fonts/hammersmith-one/HammersmithOne-Regular.ttf"
        )
      ),
      name: "Hammersmith One",
      weight: 400,
      style: "normal",
    })

    for (const id of Object.keys(LINE_NAME_TIERS)) {
      for (const slot of ["status", "also"] as const) {
        const expected = await pickOgLineLabel(renderer, id, slot)
        assert.equal(
          OG_LINE_LABEL_MAP[slot][id],
          expected,
          `${id}/${slot}: map drifted — re-run scripts/generate-og-line-label-map.ts`
        )
        assert.equal(ogLineLabel(id, slot), expected)
        // Must be a real tier, never an ellipsis
        const tiers = LINE_NAME_TIERS[id]
        assert.ok(
          [tiers.full, tiers.middle, tiers.short].includes(expected),
          `${id}/${slot} not a LineName tier`
        )
        assert.equal(expected.includes("…"), false)
        assert.equal(expected.includes("..."), false)
      }
    }
  })

  it("documents the slot budgets the OG image must keep in sync", () => {
    assert.equal(OG_LINE_LABEL_SLOTS.status.width, 300)
    assert.equal(OG_LINE_LABEL_SLOTS.status.size, 32)
    assert.equal(OG_LINE_LABEL_SLOTS.also.width, 200)
    assert.equal(OG_LINE_LABEL_SLOTS.also.size, 28)
  })
})
