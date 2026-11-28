import assert from "node:assert/strict"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

// Guard (23 Nov 2026, Mangle): app UI must not hand-roll marks the registry
// already has. Scope: components/home, components/explorer and app/ (never
// registry/, which is where the real marks live). A hit fails with the
// registry component to use instead. Add an ALLOWLIST entry only with a reason.

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")
const SCOPES = ["components/home", "components/explorer", "app"]

type Rule = { id: string; use: string } & (
  | { pattern: RegExp }
  | { find: (source: string) => { index: number; text: string }[] }
)

/** `x.className = "…"` or `x.className = cn("…"` string literals on DOM-built elements. */
const domClassNames = (source: string) =>
  [...source.matchAll(/\.className\s*=\s*(?:cn\(\s*)?"([^"]*)"/g)].map((m) => ({
    index: m.index ?? 0,
    text: m[1]!,
  }))

const RULES: readonly Rule[] = [
  {
    id: "line-pill",
    // A rounded pill painted in a line colour.
    pattern:
      /\brounded-full\b[^"'`\n]*\bbg-(?:\(--line-color\)|\[var\(--line-color\)\])|\bbg-(?:\(--line-color\)|\[var\(--line-color\)\])[^"'`\n]*\brounded-full\b/g,
    use: "LineColorBar or LineBadge from registry/tfl/brand/line-badge.tsx",
  },
  {
    id: "dom-letter-disc",
    // A DOM-built letter disc: a created element given rounded-full + font-bold classes.
    find: (source) =>
      domClassNames(source).filter(({ text }) => /\brounded-full\b/.test(text) && /\bfont-bold\b/.test(text)),
    use: "StopLetterBadge from registry/tfl/arrivals/stop-letter-badge.tsx, rendered into the marker with createRoot",
  },
  {
    id: "truncated-name",
    // `truncate` on an element whose content is a place/station name.
    pattern: /className="[^"]*\btruncate\b[^"]*"[^>]*>\s*\{[\w.?!]*\bname\}/g,
    use: "let the name wrap (text-pretty); names never ellipsise",
  },
]

/** file (repo-relative) + rule id → why it is allowed. Keep this short. */
const ALLOWLIST: Readonly<Record<string, string>> = {
  "app/docs/drawing-the-line/junction-section.tsx#truncated-name":
    "docs diagram caption for a junction, not a place in a search row",
}

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.(tsx|ts)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })

const lineOf = (source: string, index: number) => source.slice(0, index).split("\n").length

describe("app UI uses registry marks, not hand-rolled copies", () => {
  const files = SCOPES.flatMap((scope) => walk(join(root, scope)))

  for (const rule of RULES) {
    it(`no ${rule.id} in ${SCOPES.join(", ")}`, () => {
      const hits: string[] = []
      for (const file of files) {
        const rel = relative(root, file)
        if (ALLOWLIST[`${rel}#${rule.id}`]) continue
        const source = readFileSync(file, "utf8")
        const found =
          "find" in rule
            ? rule.find(source)
            : [...source.matchAll(rule.pattern)].map((m) => ({ index: m.index ?? 0, text: m[0] }))
        for (const { index, text } of found)
          hits.push(`${rel}:${lineOf(source, index)}  ${text.replace(/\s+/g, " ").slice(0, 90)}`)
      }
      assert.deepEqual(
        hits,
        [],
        `Hand-rolled ${rule.id} found. Use ${rule.use}.\n  ${hits.join("\n  ")}\n(Allowlist: ALLOWLIST["<file>#${rule.id}"] = "reason" in lib/landing/registry-marks-guard.test.ts.)`
      )
    })
  }
})
