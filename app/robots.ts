import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/catalog", "/api/registry/"],
      disallow: [
        "/api/feedback",
        "/api/stats/",
        "/temp/",
        "/drafts",
        "/tools",
        "/board/view",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
