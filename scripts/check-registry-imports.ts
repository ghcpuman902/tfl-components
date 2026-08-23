#!/usr/bin/env tsx
/**
 * Fail if a registry item ships a file that imports a local `@/` module
 * the item (and its owned registryDependencies) do not copy.
 */
import { existsSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import registry from "../registry.json" with { type: "json" }

const ROOT = process.cwd()
const IMPORT_RE =
  /from\s+["'](@\/[^"']+)["']|import\(\s*["'](@\/[^"']+)["']\s*\)/g

type RegistryFile = {
  path: string
  target?: string
}

type RegistryItem = {
  name: string
  registryDependencies?: string[]
  files?: RegistryFile[]
}

const items = registry.items as RegistryItem[]
const byName = new Map(items.map((item) => [item.name, item]))

const depName = (dep: string): string | undefined => {
  if (!dep.includes("/")) return undefined
  const match = dep.match(/\/r\/([^./]+)\.json$/)
  return match?.[1]
}

const resolveExt = (specifier: string): string | undefined => {
  const bare = specifier.replace(/^@\//, "")
  for (const ext of ["", ".ts", ".tsx", ".js", ".jsx"]) {
    const candidate = join(ROOT, `${bare}${ext}`)
    if (existsSync(candidate)) return relative(ROOT, candidate)
  }
  return undefined
}

const providedTargets = (name: string, seen = new Set<string>()): Set<string> => {
  if (seen.has(name)) return new Set()
  seen.add(name)
  const item = byName.get(name)
  if (!item) return new Set()
  const out = new Set<string>()
  for (const file of item.files ?? []) {
    out.add(file.target ?? file.path)
    out.add(file.path)
  }
  for (const dep of item.registryDependencies ?? []) {
    const child = depName(dep)
    if (child) {
      for (const target of providedTargets(child, seen)) out.add(target)
    }
  }
  return out
}

const stripExt = (value: string): string =>
  value.replace(/\.(tsx?|jsx?)$/, "")

const covers = (provided: Set<string>, candidate: string): boolean => {
  const wanted = stripExt(candidate)
  for (const entry of provided) {
    if (entry === candidate || stripExt(entry) === wanted) return true
  }
  return false
}

const coversImport = (provided: Set<string>, spec: string): boolean => {
  const bare = spec.replace(/^@\//, "")
  if (covers(provided, bare)) return true
  if (covers(provided, `${bare}.ts`)) return true
  if (covers(provided, `${bare}.tsx`)) return true
  const diskPath = resolveExt(spec)
  return diskPath ? covers(provided, diskPath) : false
}

/** Site-only helpers that happen to live in a registry file list. */
const IGNORED_GAPS = new Set([
  "live-arrivals-board: lib/tfl/live-arrivals-action.ts needs lib/tfl/cached-stop-arrivals.ts",
])

const missing: string[] = []

for (const item of items) {
  const provided = providedTargets(item.name)
  for (const file of item.files ?? []) {
    const abs = join(ROOT, file.path)
    if (!existsSync(abs)) {
      missing.push(`${item.name}: missing source ${file.path}`)
      continue
    }
    if (!/\.(tsx?|jsx?)$/.test(file.path)) continue
    const source = readFileSync(abs, "utf8")
    for (const match of source.matchAll(IMPORT_RE)) {
      const spec = match[1] ?? match[2]
      if (!spec) continue
      if (spec.startsWith("@/components/ui/")) continue
      if (spec === "@/lib/utils") continue
      if (coversImport(provided, spec)) continue
      const diskPath = resolveExt(spec)
      const message = diskPath
        ? `${item.name}: ${file.path} needs ${diskPath}`
        : `${item.name}: ${file.path} imports missing ${spec}`
      if (!IGNORED_GAPS.has(message)) missing.push(message)
    }
  }
}

if (missing.length > 0) {
  console.error("Registry import check failed:")
  for (const line of [...new Set(missing)]) console.error(`  - ${line}`)
  process.exit(1)
}

console.log(`Registry import check passed (${items.length} item(s)).`)
