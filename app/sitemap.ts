import type { MetadataRoute } from "next";
import { DOCS_ENTRIES, isInternalDocsEntry } from "@/lib/docs-catalog";
import { SITE_URL } from "@/lib/site";

const STATIC_PATHS = [
  "/",
  "/docs",
  "/docs/components",
  "/docs/troubleshoot",
  "/blocks",
  "/blocks/week-ahead",
  "/board",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const entries: MetadataRoute.Sitemap = [];

  const push = (path: string, priority: number) => {
    if (seen.has(path)) return;
    seen.add(path);
    entries.push({
      url: `${SITE_URL}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority,
    });
  };

  for (const path of STATIC_PATHS) {
    push(path, path === "/" ? 1 : 0.8);
  }

  for (const entry of DOCS_ENTRIES) {
    if (entry.comingSoon || isInternalDocsEntry(entry)) continue;
    push(entry.href.split("?")[0]!, 0.7);
  }

  return entries;
}
