import { GITHUB_REPO } from "@/lib/feedback/constants"
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site"
import {
  TFL_DASHBOARD_PATH,
  TFL_DASHBOARD_SECTION_IDS,
  TFL_DASHBOARD_TITLE,
} from "@/lib/docs/tfl-dashboard"

export const TFL_TS_NPM_URL = "https://www.npmjs.com/package/tfl-ts"
export const TFL_TS_REPO_URL = "https://github.com/ghcpuman902/tfl-ts"

export const SITE_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "tfl-components",
      alternateName: ["Board", "TfL Components", "MangleKuo tfl-components"],
      description: SITE_DESCRIPTION,
      inLanguage: "en-GB",
      author: { "@id": `${SITE_URL}/#author` },
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#board`,
      name: "Board",
      alternateName: ["tfl-components", "tfl-components Board"],
      description: `Live London buses, trains and Tube status on a spare screen, in a browser. A zero-install hosted web app for iPad wall displays at ${SITE_URL}/board/view, with no custom Unified API dashboard to write.`,
      featureList: [
        "Next trains and Tube arrivals for a stop you choose",
        "Live bus arrivals",
        "Line status",
        "Nearby cycle hire",
      ],
      url: `${SITE_URL}/board`,
      applicationCategory: "TravelApplication",
      applicationSubCategory: "Public transport display",
      operatingSystem: "Web (Safari, Chrome, any modern browser)",
      browserRequirements: "Requires JavaScript. Runs in Safari on iPad.",
      screenshot: `${SITE_URL}/opengraph-image`,
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "GBP",
      },
      isBasedOn: { "@id": `${SITE_URL}/#tfl-ts` },
      author: { "@id": `${SITE_URL}/#author` },
    },
    {
      "@type": "SoftwareSourceCode",
      "@id": `${SITE_URL}/#tfl-ts`,
      name: "tfl-ts",
      description:
        "Typed TypeScript client for the TfL Unified API. Board and the React components fetch with it.",
      url: TFL_TS_NPM_URL,
      codeRepository: TFL_TS_REPO_URL,
      programmingLanguage: "TypeScript",
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

const TFL_DASHBOARD_URL = `${SITE_URL}${TFL_DASHBOARD_PATH}`
const BOARD_URL = `${SITE_URL}/board`
const BOARD_VIEW_URL = `${SITE_URL}/board/view`

/** Questions on `/docs/tfl-dashboard`, verbatim from the approved draft. */
export const TFL_DASHBOARD_FAQS = [
  {
    question: "How do I build a TfL dashboard?",
    answer: `If you want a live departures display on a screen you already own, use Board: open ${BOARD_URL}, pick a stop, then leave the page open or add it to the Home Screen. If you want a custom React app, start at ${SITE_URL}/docs, install tfl-ts, and add a board component. You will need a free TfL API key only for the custom app.`,
  },
  {
    question: "Do I need a TfL API key?",
    answer:
      "Not for hosted Board. For a custom app that calls the TfL Unified API, yes: register at the TfL API Portal and subscribe to the free 500 requests per minute product. tfl-ts reads the key from TFL_APP_KEY.",
  },
  {
    question:
      "How do I turn an old iPad into a live London Tube departure board?",
    answer: `Open ${BOARD_URL} in Safari, pick your station or stop, then open the display at ${BOARD_VIEW_URL} and tap Share, Add to Home Screen. Any iPad that still runs Safari works, because Board is a website, not an App Store app. Plug it in and set Auto-Lock to Never.`,
  },
  {
    question: "How do I put a London departure board on a TV?",
    answer: `Configure a board at ${BOARD_URL}, copy the /board/view link, and open it in the TV's browser, or on a laptop, mini PC or streaming stick connected to the screen. Switch the browser to full screen. No app and no API key.`,
  },
  {
    question:
      "How can I show live Tube, Elizabeth line, DLR and bus arrivals on one iPad screen at home?",
    answer: `Yes. In the Board builder at ${BOARD_URL}, choose a station, then add arrivals for the Tube, Elizabeth line, DLR or Overground, nearby buses, and line status on the same display. The fullscreen page is ${BOARD_VIEW_URL}.`,
  },
  {
    question:
      "What is the simplest TfL arrivals display at home, without building an app?",
    answer: `Board. It is a zero-install hosted web app for wall displays at ${BOARD_VIEW_URL}, so there is no custom Unified API dashboard to write and no personal TfL API key to get. Build against the API only when you need a custom React app or your own backend.`,
  },
  {
    question: "Should I use Home Assistant for a TfL kiosk display?",
    answer:
      "Only if you already run it. Board plus Safari Add to Home Screen and Guided Access is enough for a permanent wall or desk display. Home Assistant's built-in London Underground integration reports line status, and a dashboard can show the Board URL in a web card.",
  },
  {
    question: "Can I build a live Tube map or a schematic network map?",
    answer:
      "Geographic maps are installable. Live train positions are a demo on this site, not installable yet. A full multi-line schematic network map is not shipped yet. Line strips for a single route, including branches, are available.",
  },
  {
    question: "Is this official TfL software?",
    answer:
      "No. This is an independent project and is not affiliated with or endorsed by Transport for London. Data comes from TfL's open Unified API, under TfL's terms.",
  },
] as const

export const TFL_DASHBOARD_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${TFL_DASHBOARD_URL}#webpage`,
      url: TFL_DASHBOARD_URL,
      name: TFL_DASHBOARD_TITLE,
      description:
        "Use Board as a live Tube and bus departure board on an iPad or TV, with no app and no API key. Or build your own dashboard with tfl-ts and React components.",
      inLanguage: "en-GB",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#board` },
    },
    {
      "@type": "FAQPage",
      "@id": `${TFL_DASHBOARD_URL}#${TFL_DASHBOARD_SECTION_IDS.faq}`,
      url: TFL_DASHBOARD_URL,
      mainEntity: TFL_DASHBOARD_FAQS.map((item) => ({
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
      "@id": `${TFL_DASHBOARD_URL}#${TFL_DASHBOARD_SECTION_IDS.ipad}`,
      name: "Set it up on an iPad",
      url: `${TFL_DASHBOARD_URL}#${TFL_DASHBOARD_SECTION_IDS.ipad}`,
      step: [
        {
          "@type": "HowToStep",
          position: 1,
          name: "Configure the board",
          text: `Open the Board builder at ${BOARD_URL}. Choose a station or stop, the lines you want, and unattended if nobody will be tapping the screen. Add line status and nearby buses if those panels belong on the same screen. No personal TfL API key is required.`,
        },
        {
          "@type": "HowToStep",
          position: 2,
          name: "Open the display",
          text: "Open the display at /board/view. The stop stays in the page address after #.",
        },
        {
          "@type": "HowToStep",
          position: 3,
          name: "Add to Home Screen",
          text: "In Safari, tap Share, then Add to Home Screen. Open the new icon. Safari's toolbar is gone. Rotate to landscape and put the iPad on a stand.",
        },
      ],
    },
    {
      "@type": "HowTo",
      "@id": `${TFL_DASHBOARD_URL}#${TFL_DASHBOARD_SECTION_IDS.tv}`,
      name: "Set it up on a TV or monitor",
      url: `${TFL_DASHBOARD_URL}#${TFL_DASHBOARD_SECTION_IDS.tv}`,
      step: [
        {
          "@type": "HowToStep",
          position: 1,
          name: "Configure the board",
          text: `On a phone or laptop, open the Board builder at ${BOARD_URL}. Choose a station or stop, the lines you want, and unattended, since nobody will be tapping the TV. No personal TfL API key is required.`,
        },
        {
          "@type": "HowToStep",
          position: 2,
          name: "Copy the display link",
          text: "Copy the display link. It starts with /board/view and keeps every setting after the #.",
        },
        {
          "@type": "HowToStep",
          position: 3,
          name: "Open it on the screen",
          text: "Open that link in the browser on the screen and switch the browser to full screen.",
        },
      ],
    },
  ],
} as const
