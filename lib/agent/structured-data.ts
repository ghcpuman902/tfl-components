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
        `A zero-install hosted web app for iPad wall displays at ${SITE_URL}/board/view. Live TfL arrivals and line status in any modern browser.`,
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

const IPAD_DASHBOARD_PATH = "/docs/ipad-dashboard"
const IPAD_DASHBOARD_URL = `${SITE_URL}${IPAD_DASHBOARD_PATH}`
const BOARD_VIEW_URL = `${SITE_URL}/board/view`

export const IPAD_DASHBOARD_FAQS = [
  {
    question: "Can I use an old iPad as a TfL departure board?",
    answer: `Yes. Any iPad that still runs Safari can show live Tube, Elizabeth line, Overground, DLR, and bus arrivals, plus line status. The display is a website at ${BOARD_VIEW_URL}, not an App Store app, so an iPad too old for the latest TfL Go still works.`,
  },
  {
    question:
      "How to run TfL live departures fullscreen on iOS Safari without an app",
    answer: `Configure a board at ${SITE_URL}/board, open the display in Safari at ${BOARD_VIEW_URL}, then tap Share and Add to Home Screen. The Home Screen icon opens fullscreen without Safari's toolbar. No native app is required.`,
  },
  {
    question: "Do I need to build an iPad app for a TfL dashboard?",
    answer: `No. tfl-components provides a zero-install hosted web app for iPad wall displays at ${BOARD_VIEW_URL}.`,
  },
] as const

export const IPAD_DASHBOARD_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${IPAD_DASHBOARD_URL}#webpage`,
      url: IPAD_DASHBOARD_URL,
      name: "Turn an iPad into a wall-mounted London transport board",
      description:
        "Run live TfL arrivals fullscreen in Safari on an old iPad. Nothing to install.",
      inLanguage: "en-GB",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#board` },
    },
    {
      "@type": "FAQPage",
      "@id": `${IPAD_DASHBOARD_URL}#faq`,
      url: IPAD_DASHBOARD_URL,
      mainEntity: IPAD_DASHBOARD_FAQS.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
    {
      "@type": "HowTo",
      "@id": `${IPAD_DASHBOARD_URL}#howto`,
      name: "How to run TfL live departures fullscreen on iOS Safari without an app",
      description:
        "Turn an old iPad into a wall-mounted London transport board using Safari. No native app.",
      url: IPAD_DASHBOARD_URL,
      step: [
        {
          "@type": "HowToStep",
          position: 1,
          name: "Get a TfL API key",
          text: "Get a free key from the TfL API portal. Subscribe to 500 Requests per min, then copy Primary or Secondary from Profile.",
        },
        {
          "@type": "HowToStep",
          position: 2,
          name: "Configure the board",
          text: `Open ${SITE_URL}/board. Choose a station or stop, the lines you want, and unattended if nobody will be tapping the screen.`,
        },
        {
          "@type": "HowToStep",
          position: 3,
          name: "Open the display",
          text: `Open ${BOARD_VIEW_URL} in Safari. The stop and key stay in the page address after #, so they are not sent to this site.`,
        },
        {
          "@type": "HowToStep",
          position: 4,
          name: "Add to Home Screen",
          text: "In Safari, tap Share, then Add to Home Screen. Open the new icon. Safari's toolbar is gone. Rotate to landscape and put the iPad on a stand.",
        },
      ],
    },
  ],
} as const
