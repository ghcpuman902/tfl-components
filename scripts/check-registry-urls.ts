#!/usr/bin/env tsx
/**
 * Fail if any catalog `registryUrl` points at a missing `public/r/*.json` file.
 * Prevents advertising install commands that 404 in production.
 */
import { existsSync } from "node:fs"
import { join } from "node:path"
import { DOCS_ENTRIES } from "../lib/docs-catalog.ts"
import { REGISTRY_BASE } from "../lib/site.ts"

const ROOT = process.cwd()
const PUBLIC_R = join(ROOT, "public", "r")

const missing: string[] = []
const seen = new Set<string>()

for (const entry of DOCS_ENTRIES) {
  if (!entry.registryUrl) continue
  if (!entry.registryUrl.startsWith(REGISTRY_BASE)) {
    missing.push(
      `${entry.slug}: registryUrl is outside REGISTRY_BASE (${entry.registryUrl})`
    )
    continue
  }
  const name = entry.registryUrl.slice(REGISTRY_BASE.length + 1) // strip `${base}/`
  if (!name.endsWith(".json")) {
    missing.push(`${entry.slug}: expected .json path, got ${entry.registryUrl}`)
    continue
  }
  if (seen.has(name)) continue
  seen.add(name)
  const filePath = join(PUBLIC_R, name)
  if (!existsSync(filePath)) {
    missing.push(`${entry.slug}: missing public/r/${name}`)
  }
}

if (missing.length > 0) {
  console.error("Registry catalog check failed:")
  for (const line of missing) console.error(`  - ${line}`)
  process.exit(1)
}

console.log(
  `Registry catalog check passed (${seen.size} unique registry JSON file(s)).`
)
