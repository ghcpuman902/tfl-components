import type { ReactNode } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import {
  serialiseStructuredData,
  TV_DISPLAY_STRUCTURED_DATA,
} from "@/lib/agent/structured-data"
import { getDocsEntry } from "@/lib/docs-catalog"
import { SITE_INDEPENDENCE } from "@/lib/site"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"
import { BOARD_VIEW_PATH } from "@/lib/tfl/board-url-state"
import { TEXT_LINK_CLASS, TEXT_LINK_ICON_CLASS } from "@/lib/text-link"
import { cn } from "@/lib/utils"

const PAGE_TITLE = "Put a London departure board on a TV"

export const metadata: Metadata = pageMetadata(ROUTE_PAGE_META.tv)

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

export default function TvDisplayPage() {
  const entry = getDocsEntry("tv")!

  return (
    <DocsReadableWidth>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serialiseStructuredData(TV_DISPLAY_STRUCTURED_DATA),
        }}
      />
      <article className="space-y-10">
        <DocsPageHeader
          entry={entry}
          title={PAGE_TITLE}
          description={ROUTE_PAGE_META.tv.description}
        />

        <p className="max-w-prose">
          A spare TV or monitor in the hall or kitchen can show the next trains,
          nearby buses, and line status all day. Board is a web page, so the
          screen only needs a browser.
        </p>

        <p>
          <Link
            href="/board"
            className={cn(TEXT_LINK_CLASS, "font-medium text-primary")}
          >
            Open the Board builder
            <ArrowRightIcon
              className={cn(TEXT_LINK_ICON_CLASS, "ml-1.5")}
              aria-hidden
            />
          </Link>
        </p>

        <section className="space-y-3">
          <h2 id="tfl-arrivals-on-a-tv" className="text-lg font-semibold">
            Show TfL arrivals on a TV at home
          </h2>
          <ol className="max-w-prose list-decimal space-y-3 pl-5 text-muted-foreground">
            <li>
              On a phone or laptop, open the{" "}
              <TextLink href="/board">Board builder</TextLink>. Choose a station
              or stop, the lines you want, and unattended, since nobody will be
              tapping the TV. No personal TfL API key is required.
            </li>
            <li>
              Copy the display link. It starts with{" "}
              <code className="text-xs text-foreground">{BOARD_VIEW_PATH}</code>{" "}
              and keeps every setting after the{" "}
              <code className="text-xs text-foreground">#</code>.
            </li>
            <li>
              Open that link in the browser on the screen and switch the browser
              to full screen.
            </li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 id="which-device" className="text-lg font-semibold">
            Which device drives the screen
          </h2>
          <ul className="max-w-prose list-disc space-y-3 pl-5 text-muted-foreground">
            <li>
              <span className="text-foreground">A smart TV browser.</span> Many
              TVs ship a web browser. Typing a long link with a remote is slow,
              so bookmark it once.
            </li>
            <li>
              <span className="text-foreground">
                A laptop, mini PC, or Raspberry Pi over HDMI.
              </span>{" "}
              The most reliable option for an all-day display. Turn off sleep
              and screen savers.
            </li>
            <li>
              <span className="text-foreground">
                A streaming stick with a browser app.
              </span>{" "}
              Works where the stick offers a full web browser.
            </li>
            <li>
              <span className="text-foreground">Casting a browser tab.</span>{" "}
              Fine for a quick look. The board stops when the laptop sleeps.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 id="layout-for-a-tv" className="text-lg font-semibold">
            Lay it out for a wide screen
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Fewer panels read better from across a room. Start with one arrivals
            board and line status, and add buses only if they fit. If the text
            is small on a large screen, use the browser&apos;s zoom.
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="other-screens" className="text-lg font-semibold">
            Other screens
          </h2>
          <p className="max-w-prose text-muted-foreground">
            On an iPad, follow{" "}
            <TextLink href="/docs/ipad-dashboard">
              Use an old iPad as a London departure board
            </TextLink>
            . To see how Board sits next to apps and physical LED boards, read
            the <TextLink href="/compare">comparison</TextLink>.
          </p>
        </section>

        <p className="max-w-prose text-sm text-muted-foreground">
          {SITE_INDEPENDENCE}
        </p>
      </article>
    </DocsReadableWidth>
  )
}
