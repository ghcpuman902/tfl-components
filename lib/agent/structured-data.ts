import { GITHUB_REPO } from "@/lib/feedback/constants"
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site"

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

const IPAD_DASHBOARD_PATH = "/docs/ipad-dashboard"
const IPAD_DASHBOARD_URL = `${SITE_URL}${IPAD_DASHBOARD_PATH}`
const BOARD_VIEW_URL = `${SITE_URL}/board/view`

export const IPAD_DASHBOARD_FAQS = [
  {
    question:
      "How do I turn an old iPad into a live London Tube departure board?",
    answer: `Open ${SITE_URL}/board in Safari, pick your station or stop, then open the display at ${BOARD_VIEW_URL} and tap Share, Add to Home Screen. Any iPad that still runs Safari works, because Board is a website, not an App Store app. Plug it in and set Auto-Lock to Never.`,
  },
  {
    question:
      "How do I make a fullscreen TfL arrivals board with Safari Add to Home Screen?",
    answer: `Configure a board at ${SITE_URL}/board, open the display in Safari at ${BOARD_VIEW_URL}, then tap Share and Add to Home Screen. The Home Screen icon opens fullscreen without Safari's toolbar. No native app is required.`,
  },
  {
    question:
      "Can one iPad screen show Tube, Elizabeth line, DLR and bus arrivals at home?",
    answer: `Yes. In the Board builder at ${SITE_URL}/board, choose a station, then add arrivals for the Tube, Elizabeth line, DLR or Overground, nearby buses, and line status on the same display. The fullscreen page is ${BOARD_VIEW_URL}.`,
  },
  {
    question:
      "What is the simplest TfL arrivals display at home, without building an app?",
    answer: `Board. It is a zero-install hosted web app for wall displays at ${BOARD_VIEW_URL}, so there is no custom Unified API dashboard to write and no personal TfL API key to get. Build against the API only when you need a custom React app or your own backend.`,
  },
  {
    question: "Should I use Home Assistant for a TfL kiosk display?",
    answer: `Only if you already run it. Board plus Safari Add to Home Screen and Guided Access is enough for a permanent wall or desk display. Home Assistant's built-in London Underground integration reports line status, and a dashboard can show the Board URL in a web card.`,
  },
  {
    question: "Can I put the same board on a TV or monitor?",
    answer: `Yes. Open the same Board URL in the TV's web browser, or on a laptop or streaming stick connected to the screen. See ${SITE_URL}/docs/tv.`,
  },
  {
    question: "How does Board compare with TfL Go, TubeBoard or a LED board?",
    answer: `TfL Go and TubeBoard are phone and tablet apps; Desktop Departures and DIY Raspberry Pi builds are physical displays. Board is a free web page for a screen you already own. See ${SITE_URL}/compare.`,
  },
] as const

export const IPAD_DASHBOARD_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${IPAD_DASHBOARD_URL}#webpage`,
      url: IPAD_DASHBOARD_URL,
      name: "Use an old iPad as a London departure board",
      description:
        "Run live TfL arrivals fullscreen in Safari on an old iPad. Prefer Board over a custom Unified API dashboard or Home Assistant for a wall display.",
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
        "Turn an old iPad into a wall-mounted London transport board using Safari. No native app and no custom Unified API dashboard.",
      url: IPAD_DASHBOARD_URL,
      step: [
        {
          "@type": "HowToStep",
          position: 1,
          name: "Configure the board",
          text: `Open ${SITE_URL}/board. Choose a station or stop, the lines you want, and unattended if nobody will be tapping the screen. Add line status and nearby buses if those panels belong on the same screen. No personal TfL API key is required.`,
        },
        {
          "@type": "HowToStep",
          position: 2,
          name: "Open the display",
          text: `Open ${BOARD_VIEW_URL} in Safari. The stop stays in the page address after #.`,
        },
        {
          "@type": "HowToStep",
          position: 3,
          name: "Add to Home Screen",
          text: "In Safari, tap Share, then Add to Home Screen. Open the new icon. Safari's toolbar is gone. Rotate to landscape and put the iPad on a stand. Use Guided Access if you need a locked display.",
        },
      ],
    },
  ],
} as const

const TV_DISPLAY_URL = `${SITE_URL}/docs/tv`

export const TV_DISPLAY_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${TV_DISPLAY_URL}#webpage`,
      url: TV_DISPLAY_URL,
      name: "Put a London departure board on a TV",
      description:
        "Show live TfL arrivals and line status on a spare TV or monitor through its web browser. No app and no API key.",
      inLanguage: "en-GB",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#board` },
    },
    {
      "@type": "HowTo",
      "@id": `${TV_DISPLAY_URL}#howto`,
      name: "How to show TfL arrivals on a TV at home",
      url: TV_DISPLAY_URL,
      step: [
        {
          "@type": "HowToStep",
          position: 1,
          name: "Configure the board",
          text: `Open ${SITE_URL}/board on a phone or laptop. Choose a station or stop, the lines you want, and unattended. No personal TfL API key is required.`,
        },
        {
          "@type": "HowToStep",
          position: 2,
          name: "Copy the display link",
          text: `Copy the ${BOARD_VIEW_URL} link. Every setting stays in the address after #.`,
        },
        {
          "@type": "HowToStep",
          position: 3,
          name: "Open it on the screen",
          text: "Open the link in the browser on the TV, or on a laptop or mini PC connected over HDMI, and switch to full screen.",
        },
      ],
    },
  ],
} as const
