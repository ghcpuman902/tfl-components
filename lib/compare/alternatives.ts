/**
 * `/compare` rows. Every claim about another product carries the public page
 * it came from and the date it was checked, so the table can be re-verified.
 * Keep wording factual: what it is, where it runs, what it costs, what it
 * shows. No ratings, no "best".
 */

export const COMPARE_CHECKED_ON = "19 October 2026"

export type CompareSource = {
  label: string
  url: string
}

export type CompareAlternative = {
  id: string
  name: string
  /** One line: what kind of thing it is and who makes it. */
  kind: string
  runsOn: string
  cost: string
  /** Live TfL departures and status, as the product describes them. */
  tflData: string
  /** When this is the better fit. Neutral, from the product's own scope. */
  goodFit: string
  sources: readonly CompareSource[]
}

export const BOARD_ROW: CompareAlternative = {
  id: "board",
  name: "Board",
  kind: "Free hosted web page from this site. Not an app-store app.",
  runsOn:
    "Any screen with a modern browser: an old iPad in Safari, a TV or monitor browser, a laptop.",
  cost: "Free. No account and no personal TfL API key.",
  tflData:
    "Live Tube, Elizabeth line, Overground, DLR and bus arrivals for a stop you choose, line status, river bus and cycle hire panels.",
  goodFit:
    "A screen that stays on by the door or in the kitchen, using hardware you already own.",
  sources: [{ label: "Board builder", url: "/board" }],
}

export const COMPARE_ALTERNATIVES: readonly CompareAlternative[] = [
  {
    id: "tfl-go",
    name: "TfL Go",
    kind: "Transport for London's official travel app.",
    runsOn: "iPhone, iPad and Android.",
    cost: "Free.",
    tflData:
      "Live arrivals for bus, Tube, Overground, Elizabeth line, DLR, tram and National Rail, plus line status, journey planning, step-free mode and Oyster and contactless account tools.",
    goodFit:
      "Planning a journey or checking a stop on the phone in your hand, including step-free routes.",
    sources: [
      { label: "TfL: TfL Go", url: "https://tfl.gov.uk/maps_/tfl-go" },
      {
        label: "App Store listing",
        url: "https://apps.apple.com/gb/app/tfl-go-plan-pay-travel/id1419541638",
      },
    ],
  },
  {
    id: "stationly",
    name: "Stationly",
    kind: "Independent departure-board app and home-screen widget.",
    runsOn:
      "Android home-screen widget, with a full-screen board when the phone is charging or docked.",
    cost: "Free, with an optional in-app support purchase (developer's launch post).",
    tflData:
      "Tube, Overground, DLR, Elizabeth line, National Rail and bus departures from TfL open data.",
    goodFit:
      "Seeing the next departure on an Android home screen, or turning a docked Android phone into a small board.",
    sources: [
      { label: "stationly.co.uk", url: "https://stationly.co.uk/" },
      {
        label: "Developer post, r/droidappshowcase",
        url: "https://www.reddit.com/r/droidappshowcase/comments/1wud3wa/stationly_live_london_tfl_arrivals_on_your_phone/",
      },
    ],
  },
  {
    id: "tubeboard",
    name: "TubeBoard",
    kind: "Independent station-board app.",
    runsOn: "iPhone and iPad, with Apple Watch and Apple Vision Pro support.",
    cost: "Free tier. Premium is monthly, yearly or lifetime.",
    tflData:
      "Underground, Elizabeth line, DLR and London Overground departures grouped by platform, plus line status. Free covers live arrivals and one saved station; Premium adds widgets, Live Activities (including StandBy) and alerts.",
    goodFit:
      "A platform-style board on an iPhone or iPad, on the Lock Screen or in StandBy.",
    sources: [
      {
        label: "App Store listing",
        url: "https://apps.apple.com/gb/app/tubeboard-live-departures/id6779771046",
      },
    ],
  },
  {
    id: "home-assistant",
    name: "Home Assistant kiosk",
    kind: "Open-source home automation server with a dashboard shown full screen on a tablet.",
    runsOn:
      "A Home Assistant server you run, plus a tablet or screen showing its dashboard.",
    cost: "Free software. You provide and maintain the server.",
    tflData:
      "The built-in London Underground integration reports line status (Tube, Overground, DLR, Elizabeth line). It does not provide station arrivals; a Board URL can be shown in a dashboard web card.",
    goodFit:
      "Homes that already run Home Assistant and want transport next to lights, heating and sensors.",
    sources: [
      {
        label: "Home Assistant: London Underground",
        url: "https://www.home-assistant.io/integrations/london_underground/",
      },
    ],
  },
  {
    id: "dakboard",
    name: "DAKboard",
    kind: "Wall-display service for calendars, photos, weather and news.",
    runsOn: "Any device with a web browser, or DAKboard's own wall displays.",
    cost: "Free plan with DAKboard branding. Essential $5 and Plus $8 a month billed annually (USD). Wall displays from $699.95.",
    tflData:
      "No TfL departures block that we found. Its Traffic & Transit Times block needs a paid plan and your own Google API key with billing; a website block can embed a page such as a Board URL.",
    goodFit:
      "A family calendar and photo frame first, with transport as one block among many.",
    sources: [
      { label: "DAKboard pricing", url: "https://dakboard.com/pricing" },
      {
        label: "DAKboard: Traffic & Transit Times block",
        url: "https://dakboard.freshdesk.com/support/solutions/articles/35000106066-how-to-add-a-traffic-transit-times-block-to-dakboard",
      },
      { label: "DAKboard shop", url: "https://shop.dakboard.com/" },
    ],
  },
  {
    id: "diy-pi",
    name: "DIY Raspberry Pi LED or OLED build",
    kind: "A hobby build: a small computer driving a dot-matrix style display.",
    runsOn:
      "For example a Raspberry Pi Zero and a 256×64 OLED, as in the open-source train-departure-display project.",
    cost: "Parts plus your time. The software is free.",
    tflData:
      "That project reads National Rail data with an OpenLDBWS key. Tube arrivals mean writing or adapting code against the TfL Unified API yourself.",
    goodFit:
      "People who want a physical, sign-like object and enjoy building and maintaining it.",
    sources: [
      {
        label: "chrisys/train-departure-display",
        url: "https://github.com/chrisys/train-departure-display",
      },
      {
        label: "Configuration docs",
        url: "https://github.com/chrisys/train-departure-display/blob/main/docs/04-configuration.md",
      },
    ],
  },
  {
    id: "desktop-departures",
    name: "Desktop Departures",
    kind: "A ready-made miniature departure board from UK Departure Boards.",
    runsOn: "Its own 10.5 cm, 256×64 OLED device on Wi-Fi.",
    cost: "£164.99 for the board (listed 19 October 2026), with one month of Premium. Works without a subscription; Premium from £5.99 a month.",
    tflData:
      "Tube, bus, tram and river boat from TfL, plus National Rail. One station at a time; Premium can cycle between stations. Data refreshes every 60 seconds free, 30 seconds with Premium.",
    goodFit:
      "A gift or desk object that looks like a real station sign, with no screen of your own needed.",
    sources: [
      {
        label: "UK Departure Boards: Desktop Departures",
        url: "https://ukdepartureboards.co.uk/store/product/desktop-departures/",
      },
      {
        label: "UK Departure Boards: subscriptions",
        url: "https://ukdepartureboards.co.uk/store/product/subscriptions/",
      },
    ],
  },
]
