import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  buildColourTokens,
  buildColourTokensArtefacts,
  colourTokensCssIsCurrent,
  COLOUR_TOKENS_CSS_PATH,
  COLOUR_TOKENS_REGISTRY_PATH,
  COLOURS_REGISTRY_URL,
} from "../../scripts/build-colour-tokens";
import { northernDarkOklch } from "./dark-line-colours";

describe("colour tokens generator", () => {
  it("emits line + mode tokens with kebab data-line ids", () => {
    const tokens = buildColourTokens();
    const byVar = Object.fromEntries(tokens.map((t) => [t.varName, t]));

    assert.ok(byVar["tfl-line-central"]);
    assert.equal(byVar["tfl-line-central"].primaryId, "central");
    assert.ok(byVar["tfl-line-central"].oklch.startsWith("oklch("));

    assert.ok(byVar["tfl-line-hammersmith-city"]);
    assert.deepEqual(byVar["tfl-line-hammersmith-city"].dataLineIds, [
      "hammersmith-city",
    ]);

    assert.ok(byVar["tfl-mode-elizabeth"]);
    assert.deepEqual(byVar["tfl-mode-elizabeth"].dataLineIds, [
      "elizabeth",
      "elizabeth-line",
    ]);

    assert.ok(byVar["tfl-mode-cable-car"]);
    assert.deepEqual(byVar["tfl-mode-cable-car"].dataLineIds, [
      "cable-car",
      "london-cable-car",
    ]);
  });

  it("applies Go night OKLCH method in dark; Northern uses #FCFCFC", () => {
    const { cssVars } = buildColourTokensArtefacts();
    assert.equal(
      cssVars.dark["tfl-line-northern"],
      northernDarkOklch(),
    );
    assert.equal(cssVars.dark["tfl-ink-line-northern"], "oklch(0% 0 0)");
    assert.notEqual(
      cssVars.dark["tfl-line-central"],
      cssVars.light["tfl-line-central"],
    );
    assert.ok(cssVars.dark["tfl-line-central"].startsWith("oklch("));
  });

  it("keeps committed app/tfl-colours.css in sync (run pnpm registry:build)", () => {
    assert.equal(
      colourTokensCssIsCurrent(),
      true,
      `${COLOUR_TOKENS_CSS_PATH} is stale — run: pnpm exec tsx scripts/build-colour-tokens.ts`,
    );
  });

  it("keeps registry.json tfl-colours cssVars/css in sync", () => {
    const expected = buildColourTokensArtefacts();
    const registry = JSON.parse(
      readFileSync(COLOUR_TOKENS_REGISTRY_PATH, "utf8"),
    ) as {
      items: Array<{
        name: string;
        cssVars?: unknown;
        css?: unknown;
        registryDependencies?: string[];
      }>;
    };
    const item = registry.items.find((entry) => entry.name === "tfl-colours");
    assert.ok(item, "tfl-colours registry item missing");
    assert.deepEqual(item.cssVars, expected.cssVars);
    assert.deepEqual(item.css, expected.css);

    const lineBadge = registry.items.find((entry) => entry.name === "line-badge");
    assert.ok(lineBadge?.registryDependencies?.includes(COLOURS_REGISTRY_URL));

    const ownNames = new Set(registry.items.map((entry) => entry.name));
    for (const entry of registry.items) {
      for (const dep of entry.registryDependencies ?? []) {
        assert.equal(
          ownNames.has(dep),
          false,
          `${entry.name} has bare own registryDependency "${dep}" — use ${COLOURS_REGISTRY_URL.replace(/tfl-colours\.json$/, `${dep}.json`)} so URL installs do not hit ui.shadcn.com`,
        );
      }
    }

    const tube = registry.items.find(
      (entry) => entry.name === "tube-status-board",
    );
    assert.ok(
      tube?.registryDependencies?.includes(
        COLOURS_REGISTRY_URL.replace("tfl-colours.json", "line-badge.json"),
      ),
    );
  });
});
