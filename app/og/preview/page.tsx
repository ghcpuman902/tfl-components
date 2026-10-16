import type { Metadata } from "next"
import Image from "next/image"
import {
  BOARD_HOME_DESCRIPTION,
  BOARD_HOME_TITLE,
  BOARD_SITE_NAME,
  SITE_TITLE_TEMPLATE,
  SITE_URL,
} from "@/lib/site"
import { OG_IMAGE, OG_IMAGE_URL } from "@/lib/og/image"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = pageMetadata({
  title: "Open Graph preview",
  description: "Homepage title, description, and social card.",
  path: "/og/preview",
  robots: { index: false, follow: false },
})

const TAGS = [
  ["title", BOARD_HOME_TITLE],
  ["description", BOARD_HOME_DESCRIPTION],
  ["metadataBase", SITE_URL],
  ["title template", SITE_TITLE_TEMPLATE],
  ["og:type", "website"],
  ["og:locale", "en_GB"],
  ["og:site_name", BOARD_SITE_NAME],
  ["og:title", BOARD_HOME_TITLE],
  ["og:description", BOARD_HOME_DESCRIPTION],
  ["og:url", SITE_URL],
  ["og:image", OG_IMAGE_URL],
  ["og:image:width", String(OG_IMAGE.width)],
  ["og:image:height", String(OG_IMAGE.height)],
  ["og:image:alt", OG_IMAGE.alt],
  ["twitter:card", "summary_large_image"],
  ["twitter:title", BOARD_HOME_TITLE],
  ["twitter:description", BOARD_HOME_DESCRIPTION],
  ["twitter:image", OG_IMAGE_URL],
] as const

export default function OgPreviewPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="tfl-title text-3xl text-foreground">Open Graph preview</h1>
      <Image
        src={OG_IMAGE.path}
        alt={OG_IMAGE.alt}
        width={OG_IMAGE.width}
        height={OG_IMAGE.height}
        unoptimized
        className="mt-6 h-auto w-full border border-border bg-background"
      />
      <dl className="mt-8 border-t border-border">
        {TAGS.map(([name, content]) => (
          <div
            key={name}
            className="grid gap-1 border-b border-border py-2 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-4"
          >
            <dt className="font-mono text-xs text-muted-foreground">{name}</dt>
            <dd className="min-w-0 text-sm break-all text-foreground">
              {content}
            </dd>
          </div>
        ))}
      </dl>
    </main>
  )
}
