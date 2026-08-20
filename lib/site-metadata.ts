import type { Metadata } from "next"
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site"

export type PageMetaInput = {
  title: string
  description: string
  path: string
  robots?: Metadata["robots"]
  /** Home uses the bare site name as the document title. */
  absoluteTitle?: boolean
}

const absoluteUrl = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  const suffix = path === "/" ? "" : path
  return `${SITE_URL}${suffix}`
}

/** Route-specific title, description, canonical, Open Graph, and Twitter card. */
export const pageMetadata = ({
  title,
  description,
  path,
  robots,
  absoluteTitle = false,
}: PageMetaInput): Metadata => {
  const url = absoluteUrl(path)
  const documentTitle = absoluteTitle ? { absolute: title } : title

  return {
    title: documentTitle,
    description,
    alternates: { canonical: url },
    robots,
    openGraph: {
      type: "website",
      locale: "en_GB",
      siteName: SITE_NAME,
      title,
      description,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export const HOME_PAGE_META = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  path: "/",
} as const satisfies PageMetaInput

export const ROUTE_PAGE_META = {
  home: HOME_PAGE_META,
  docs: {
    title: "Get started",
    description:
      "Configure a hosted Board, or install React components for London transport displays.",
    path: "/docs",
  },
  components: {
    title: "Components",
    description: "Preferred boards first, then the parts they are built from.",
    path: "/docs/components",
  },
  explorer: {
    title: "Explorer",
    description:
      "Points are stations, stops, and docks; lines are the routes that serve them.",
    path: "/docs/explorer",
  },
  board: {
    title: "Board",
    description:
      "Configure a live station display and open a bookmarkable URL.",
    path: "/board",
  },
  boardView: {
    title: "Board display",
    description:
      "Full-screen station display set from the Board builder. Configuration stays in the page URL.",
    path: "/board/view",
    robots: { index: false, follow: false },
  },
  labs: {
    title: "Labs",
    description:
      "Experimental displays and composed examples built from the component library. These may change or break before version 1.0.",
    path: "/labs",
  },
  licence: {
    title: "Licence",
    description:
      "MIT for installable React components. TfL marks and datasets stay under their own terms.",
    path: "/licence",
  },
  credits: {
    title: "Data and credits",
    description:
      "TfL, OpenStreetMap, OpenFreeMap, and OpenMapTiles sources used by this project.",
    path: "/credits",
  },
  accessibility: {
    title: "Accessibility",
    description:
      "Keyboard access, contrast, reduced motion, and how to report a problem.",
    path: "/accessibility",
  },
  privacy: {
    title: "Privacy",
    description:
      "What this site stores in the browser, including TfL keys and a visitor cookie.",
    path: "/privacy",
  },
  howItWasBuilt: {
    title: "How it was built",
    description:
      "Engineering notes on TfL identifiers, caching, unattended displays, and the Open Code split.",
    path: "/how-it-was-built",
  },
} as const satisfies Record<string, PageMetaInput>
