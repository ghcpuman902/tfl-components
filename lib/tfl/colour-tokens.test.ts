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
    const { cssVars, cssText } = buildColourTokensArtefacts();
    assert.equal(
      cssVars.dark["tfl-line-northern"],
      northernDarkOklch(),
    );
    assert.equal(
      Object.keys(cssVars.light).some((key) => key.startsWith("tfl-ink-")),
      false,
    );
    assert.match(
      cssText,
      /\.dark \[data-line='northern'\] \{\n  --line-ink: oklch\(0% 0 0\);/,
    );
    assert.notEqual(
      cssVars.dark["tfl-line-central"],
      cssVars.light["tfl-line-central"],
    );
    assert.ok(cssVars.dark["tfl-line-central"].startsWith("oklch("));
    assert.equal(
      cssVars.light["tfl-diagram-cable-car"],
      cssVars.light["tfl-line-central"],
    );
    assert.equal(
      cssVars.dark["tfl-diagram-cable-car"],
      cssVars.dark["tfl-line-central"],
    );
    assert.match(
      cssText,
      /\[data-line='liberty'\] \{\n    --line-raw: var\(--tfl-line-liberty\);\n    --line-stroke-style: parallel;/,
    );
    assert.match(
      cssText,
      /\[data-line='cable-car'\] \{\n    --line-raw: var\(--tfl-mode-cable-car\);\n    --line-stroke-style: cable-car;/,
    );
    assert.match(
      cssText,
      /\[data-line='cable-car'\]\[data-tfl-diagram\],\n\[data-line='london-cable-car'\]\[data-tfl-diagram\] \{\n  --line-raw: var\(--tfl-diagram-cable-car\);/,
    );
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
    const files = (item as { files?: Array<{ target?: string }> }).files;
    assert.ok(
      files?.some((file) => file.target === "lib/tfl/line-colour-map.ts"),
      "tfl-colours should ship line-colour-map.ts",
    );
    assert.ok(
      files?.some((file) => file.target === "lib/tfl/route-track.ts"),
      "tfl-colours should ship route-track.ts",
    );

    const lineBadge = registry.items.find((entry) => entry.name === "line-badge");
    assert.ok(lineBadge?.registryDependencies?.includes(COLOURS_REGISTRY_URL));
    const lineBadgeFiles = (lineBadge as { files?: Array<{ target?: string }> })
      .files;
    assert.ok(
      lineBadgeFiles?.some((file) => file.target === "lib/tfl/route-track.ts"),
      "line-badge should ship route-track.ts",
    );

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
