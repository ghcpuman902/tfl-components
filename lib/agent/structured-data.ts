import { GITHUB_REPO } from "@/lib/feedback/constants"
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site"

export const SITE_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "tfl-components",
      alternateName: ["TfL Components", "MangleKuo tfl-components"],
      description: SITE_DESCRIPTION,
      inLanguage: "en-GB",
      author: { "@id": `${SITE_URL}/#author` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#board`,
      name: "tfl-components Board",
      alternateName: "TfL Board by tfl-components",
      description:
        "A hosted London transport arrivals and status board for an iPad, tablet, monitor, or other modern browser.",
      url: `${SITE_URL}/board`,
      applicationCategory: "TravelApplication",
      applicationSubCategory: "Public transport display",
      operatingSystem: "Any operating system with a modern web browser",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "GBP",
      },
      author: { "@id": `${SITE_URL}/#author` },
    },
    {
      "@type": "SoftwareSourceCode",
      "@id": `${SITE_URL}/#source`,
      name: "tfl-components",
      description:
        "Installable React source for London transport boards, maps, diagrams, labels, chips, and interface foundations.",
      url: `${SITE_URL}/docs/components`,
      codeRepository: GITHUB_REPO,
      programmingLanguage: ["TypeScript", "TSX", "CSS"],
      runtimePlatform: "React",
      license: `${SITE_URL}/docs/tfl-licensing`,
      author: { "@id": `${SITE_URL}/#author` },
    },
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#author`,
      name: "MangleKuo",
      url: "https://manglekuo.com",
      sameAs: ["https://github.com/ghcpuman902"],
    },
  ],
} as const

export const serialiseStructuredData = (value: unknown): string =>
  JSON.stringify(value).replaceAll("<", "\\u003c")
