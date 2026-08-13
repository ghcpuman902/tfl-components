#!/usr/bin/env tsx
/**
 * Fail if any `"use server"` file mentions a client-supplied `appKey` parameter
 * (or similar). User TfL keys must never enter Server Actions.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_ROOTS = ["app", "components", "hooks", "lib", "registry"];
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist"]);

const USE_SERVER_RE = /["']use server["']/;
/** Parameter / destructure patterns that would accept a client key. */
const FORBIDDEN_RE =
  /\b(appKey|app_key|userAppKey|tflAppKey|userKey)\s*[:?=,)]/;

const walk = (dir: string, out: string[] = []): string[] => {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx|mts|cts)$/.test(entry)) continue;
    out.push(full);
  }
  return out;
};

const offenders: { file: string; line: number; text: string }[] = [];

for (const root of SCAN_ROOTS) {
  for (const file of walk(join(ROOT, root))) {
    const source = readFileSync(file, "utf8");
    if (!USE_SERVER_RE.test(source)) continue;
    const lines = source.split("\n");
    lines.forEach((text, index) => {
      // Allow comments that document the ban.
      const trimmed = text.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
      if (FORBIDDEN_RE.test(text)) {
        offenders.push({
          file: relative(ROOT, file),
          line: index + 1,
          text: trimmed,
        });
      }
    });
  }
}

if (offenders.length > 0) {
  console.error(
    "Forbidden: Server Action files must not accept client appKey / user key params.\n",
  );
  for (const item of offenders) {
    console.error(`  ${item.file}:${item.line}: ${item.text}`);
  }
  process.exit(1);
}

console.log("check-no-server-appkey: ok");
