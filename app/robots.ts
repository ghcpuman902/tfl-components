import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

/** Paths open to crawlers, including generative-engine bots. */
const ALLOW = [
  "/",
  "/llms.txt",
  "/index.md",
  "/openapi.json",
  "/api/catalog",
  "/api/registry/",
] as const

const DISALLOW = [
  "/api/feedback",
  "/api/stats/",
  "/temp/",
  "/drafts",
  "/tools",
  "/board/view",
] as const

/** Generative-engine and AI-search user agents that should read public docs. */
const AI_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "PerplexityBot",
  "Bytespider",
] as const

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [...ALLOW],
        disallow: [...DISALLOW],
      },
      ...AI_USER_AGENTS.map((userAgent) => ({
        userAgent,
        allow: [...ALLOW],
        disallow: [...DISALLOW],
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
