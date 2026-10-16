import { SITE_URL } from "@/lib/site"

/** Shared Open Graph card. Served from the `app/opengraph-image` route. */
export const OG_IMAGE = {
  path: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Board departure display with Tube and bus rows at King's Cross.",
} as const

export const OG_IMAGE_URL = `${SITE_URL}${OG_IMAGE.path}`
