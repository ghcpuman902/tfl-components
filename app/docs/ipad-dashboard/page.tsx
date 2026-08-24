import type { ReactNode } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import {
  IPAD_DASHBOARD_STRUCTURED_DATA,
  serialiseStructuredData,
} from "@/lib/agent/structured-data"
import { getDocsEntry } from "@/lib/docs-catalog"
import { SITE_INDEPENDENCE } from "@/lib/site"
import { pageMetadata } from "@/lib/site-metadata"
import { TFL_API_PORTAL_PRODUCT_URL } from "@/lib/tfl/api-portal"
import { BOARD_VIEW_PATH } from "@/lib/tfl/board-url-state"
import { TEXT_LINK_CLASS, TEXT_LINK_ICON_CLASS } from "@/lib/text-link"
import { cn } from "@/lib/utils"

const PAGE_TITLE = "Turn an iPad into a wall-mounted London transport board"
const PAGE_DESCRIPTION =
  "Run live TfL arrivals fullscreen in Safari on an old iPad. Nothing to install."

export const metadata: Metadata = pageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: "/docs/ipad-dashboard",
})

const TextLink = ({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) => (
  <Link href={href} className={cn(TEXT_LINK_CLASS, "text-foreground")}>
    {children}
  </Link>
)

const ExternalTextLink = ({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) => (
  <a
    href={href}
    className={cn(TEXT_LINK_CLASS, "text-foreground")}
    target="_blank"
    rel="noopener noreferrer"
  >
    {children}
  </a>
)

export default function IpadDashboardPage() {
  const entry = getDocsEntry("ipad-dashboard")!

  return (
    <DocsReadableWidth>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serialiseStructuredData(IPAD_DASHBOARD_STRUCTURED_DATA),
        }}
      />
      <article className="space-y-10">
        <DocsPageHeader
          entry={entry}
          title={PAGE_TITLE}
          description={PAGE_DESCRIPTION}
        />

        <p className="max-w-prose">
          TfL Go is for a phone in your hand. A hallway iPad is a different
          job. The next trains and the line status need to be large, and
          already on the stop you use.
        </p>

        <p>
          <Link
            href="/board"
            className={cn(TEXT_LINK_CLASS, "font-medium text-primary")}
          >
            Open the Board builder
            <ArrowRightIcon className={cn(TEXT_LINK_ICON_CLASS, "ml-1.5")} aria-hidden />
          </Link>
        </p>

        <section className="space-y-3">
          <h2
            id="can-i-use-an-old-ipad"
            className="text-lg font-semibold"
          >
            Can I use an old iPad as a TfL departure board?
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Yes. Any iPad that still runs Safari can show live Tube, Elizabeth
            line, Overground, DLR, and bus arrivals, plus line status. The
            display is a website, not an App Store app, so an iPad too old for
            the latest TfL Go still works.
          </p>
          <p className="max-w-prose text-muted-foreground">
            A kitchen tablet, a spare monitor, or a phone on a stand works the
            same way. The iPad is just the screen people actually leave plugged
            in.
          </p>
        </section>

        <section className="space-y-3">
          <h2
            id="fullscreen-safari-without-an-app"
            className="text-lg font-semibold"
          >
            How to run TfL live departures fullscreen on iOS Safari without an
            app
          </h2>
          <p className="max-w-prose text-muted-foreground">
            You do not need Xcode, TestFlight, or a native dashboard. Configure
            the board in a browser, then save that page to the Home Screen.
          </p>
          <ol className="max-w-prose list-decimal space-y-3 pl-5 text-muted-foreground">
            <li>
              Get a free key from the{" "}
              <ExternalTextLink href={TFL_API_PORTAL_PRODUCT_URL}>
                TfL API portal
              </ExternalTextLink>
              . Subscribe to 500 Requests per min, then copy Primary or
              Secondary from Profile.
            </li>
            <li>
              Open the{" "}
              <TextLink href="/board">Board builder</TextLink>. Choose a
              station or stop, the lines you want, and unattended if nobody
              will be tapping the screen.
            </li>
            <li>
              Open the display at{" "}
              <code className="text-xs text-foreground">{BOARD_VIEW_PATH}</code>
              . The stop and key stay in the page address after{" "}
              <code className="text-xs text-foreground">#</code>, so they are
              not sent to this site.
            </li>
            <li>
              In Safari, tap Share, then Add to Home Screen. Open the new icon.
              Safari&apos;s toolbar is gone. Rotate to landscape and put the
              iPad on a stand.
            </li>
          </ol>
          <p className="max-w-prose text-muted-foreground">
            Use Safari. Chrome on iOS keeps its own toolbar. Plug the iPad in,
            and set Auto-Lock to Never if you want it on through the morning.
            Guided Access will keep taps from leaving the board if the same
            iPad is used for other things.
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="what-it-shows" className="text-lg font-semibold">
            What the board shows
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Arrivals at the stop you chose, and line status beside them or as
            the whole board. Add buses, river, or cycle hire if those panels
            matter in that room. Walking directions and disruption reroutes
            belong in{" "}
            <ExternalTextLink href="https://apps.apple.com/gb/app/tfl-go/id1555929648">
              TfL Go
            </ExternalTextLink>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="encode-the-board" className="text-lg font-semibold">
            Encode the board in a URL
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Every setting lives in the page address, so you can bookmark the
            display or open it on another screen. See the{" "}
            <TextLink href="/docs/board-url">Board URL specification</TextLink>
            . To build the same boards in your own React app, start from{" "}
            <TextLink href="/docs">Get started</TextLink>.
          </p>
        </section>

        <p className="max-w-prose text-sm text-muted-foreground">
          {SITE_INDEPENDENCE}
        </p>
      </article>
    </DocsReadableWidth>
  )
}
