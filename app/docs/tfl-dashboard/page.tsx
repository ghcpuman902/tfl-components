import type { ReactNode } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import {
  serialiseStructuredData,
  TFL_DASHBOARD_FAQS,
  TFL_DASHBOARD_STRUCTURED_DATA,
} from "@/lib/agent/structured-data"
import { getDocsEntry } from "@/lib/docs-catalog"
import {
  TFL_DASHBOARD_DEK,
  TFL_DASHBOARD_PATHS,
  TFL_DASHBOARD_SECTION_IDS as IDS,
  TFL_DASHBOARD_TITLE,
} from "@/lib/docs/tfl-dashboard"
import { SITE_INDEPENDENCE } from "@/lib/site"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"
import { BOARD_VIEW_PATH } from "@/lib/tfl/board-url-state"
import { TEXT_LINK_CLASS, TEXT_LINK_ICON_CLASS } from "@/lib/text-link"
import { cn } from "@/lib/utils"

export const metadata: Metadata = pageMetadata(ROUTE_PAGE_META.tflDashboard)

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

const Section = ({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) => (
  <section className="space-y-3" aria-labelledby={id}>
    <h2 id={id} className="text-lg font-semibold">
      {title}
    </h2>
    {children}
  </section>
)

const Prose = ({ children }: { children: ReactNode }) => (
  <p className="max-w-prose text-muted-foreground">{children}</p>
)

const Code = ({ children }: { children: ReactNode }) => (
  <code className="text-xs text-foreground">{children}</code>
)

export default function TflDashboardPage() {
  const entry = getDocsEntry("tfl-dashboard")!

  return (
    <DocsReadableWidth>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serialiseStructuredData(TFL_DASHBOARD_STRUCTURED_DATA),
        }}
      />
      <article className="space-y-10">
        <DocsPageHeader
          entry={entry}
          title={TFL_DASHBOARD_TITLE}
          description={TFL_DASHBOARD_DEK}
        />

        {/*
          First fold: both paths and both CTAs must be visible at 390×844
          under the docs chrome, so this group uses tighter spacing than the
          rest of the article (and pulls up into the header's mb-8).
        */}
        <div className="-mt-2 space-y-6">
          {TFL_DASHBOARD_PATHS.map((path) => (
            <section
              key={path.id}
              className="space-y-2"
              aria-labelledby={path.id}
            >
              <h2 id={path.id} className="text-lg font-semibold">
                {path.title}
              </h2>
              <Prose>{path.body}</Prose>
              <p>
                <Link
                  href={path.cta.href}
                  className={cn(TEXT_LINK_CLASS, "font-medium text-primary")}
                >
                  {path.cta.label}
                  <ArrowRightIcon
                    className={cn(TEXT_LINK_ICON_CLASS, "ml-1.5")}
                    aria-hidden
                  />
                </Link>
              </p>
            </section>
          ))}
        </div>

        <Section id={IDS.ipad} title="Set it up on an iPad">
          <Prose>
            You do not need Xcode, TestFlight, or a native dashboard. Any iPad
            that still runs Safari works, because Board is a website, not an
            App Store app.
          </Prose>
          <ol className="max-w-prose list-decimal space-y-3 pl-5 text-muted-foreground">
            <li>
              Open the <TextLink href="/board">Board builder</TextLink>. Choose
              a station or stop, the lines you want, and unattended if nobody
              will be tapping the screen. Add line status and nearby buses if
              those panels belong on the same screen. No personal TfL API key is
              required.
            </li>
            <li>
              Open the display at <Code>{BOARD_VIEW_PATH}</Code>. The stop stays
              in the page address after <Code>#</Code>.
            </li>
            <li>
              In Safari, tap Share, then Add to Home Screen. Open the new icon.
              Safari&apos;s toolbar is gone. Rotate to landscape and put the
              iPad on a stand.
            </li>
          </ol>
          <Prose>
            Use Safari. Chrome on iOS keeps its own toolbar. Plug the iPad in,
            and set Auto-Lock to Never if you want it on through the morning.
            Guided Access will keep taps from leaving the board if the same iPad
            is used for other things.
          </Prose>
          <Prose>
            A kitchen tablet, a spare monitor, or a phone on a stand works the
            same way.
          </Prose>
        </Section>

        <Section id={IDS.tv} title="Set it up on a TV or monitor">
          <ol className="max-w-prose list-decimal space-y-3 pl-5 text-muted-foreground">
            <li>
              On a phone or laptop, open the{" "}
              <TextLink href="/board">Board builder</TextLink>. Choose a station
              or stop, the lines you want, and unattended, since nobody will be
              tapping the TV. No personal TfL API key is required.
            </li>
            <li>
              Copy the display link. It starts with{" "}
              <Code>{BOARD_VIEW_PATH}</Code> and keeps every setting after the{" "}
              <Code>#</Code>.
            </li>
            <li>
              Open that link in the browser on the screen and switch the browser
              to full screen.
            </li>
          </ol>
          <Prose>
            A laptop, mini PC, or Raspberry Pi over HDMI is the most reliable
            option for an all-day display. Turn off sleep and screen savers. A
            smart TV browser works too; bookmark the link once, because typing
            it with a remote is slow. Casting a browser tab is fine for a quick
            look — the board stops when the laptop sleeps.
          </Prose>
          <Prose>
            Fewer panels read better from across a room. Start with one arrivals
            board and line status, and add buses only if they fit. If the text
            is small on a large screen, use the browser&apos;s zoom.
          </Prose>
        </Section>

        <Section id={IDS.homeAssistant} title="Home Assistant">
          <Prose>
            Only if you already run it. Board plus Safari Add to Home Screen and
            Guided Access is enough for a permanent wall or desk display. Home
            Assistant&apos;s built-in London Underground integration reports
            line status, not station arrivals. A dashboard can show the Board
            URL in a web card. Build a custom card only if you want to maintain
            that yourself.
          </Prose>
        </Section>

        <Section id={IDS.homeview} title="Apple HomeView">
          <Prose>
            Board has a glance mode for room-distance reading, including Apple
            HomeView&apos;s Safari tab. That device is not an always-on wall
            appliance, and some behaviours are still unconfirmed. See{" "}
            <TextLink href="/docs/apple-homeview">
              Board in HomeView Safari
            </TextLink>
            .
          </Prose>
        </Section>

        <Section id={IDS.url} title="Encode the board in a URL">
          <Prose>
            Every setting lives in the page address, so you can bookmark the
            display or open it on another screen. See the{" "}
            <TextLink href="/docs/board-url">Board URL specification</TextLink>.
          </Prose>
        </Section>

        <Section id={IDS.build} title="Build a custom React dashboard">
          <Prose>
            Start from a React app with shadcn already initialised. Get a free
            key from the{" "}
            <ExternalTextLink href="https://api-portal.tfl.gov.uk/">
              TfL API portal
            </ExternalTextLink>
            , install tfl-ts, and add a board component. The{" "}
            <TextLink href="/docs">Get started</TextLink> page has the install
            command and a first example. The{" "}
            <TextLink href="/docs/components">component catalogue</TextLink>{" "}
            lists the boards, maps, line strips and colours.
          </Prose>
          <Prose>
            Do not start by writing a custom HTML page against the TfL Unified
            API if you just want a wall or desk display — use Board instead.
          </Prose>
          <Prose>
            Johnston type and the Underground roundel need a licence from TfL.
            This site uses P22 Underground; Hammersmith One is the free
            alternative. See <TextLink href="/docs/typography">Typography</TextLink>{" "}
            and{" "}
            <TextLink href="/docs/tfl-licensing">
              Licensing and brand use
            </TextLink>
            .
          </Prose>
        </Section>

        <Section id={IDS.notReady} title="What is not ready yet">
          <Prose>
            A full multi-line schematic network map is not shipped yet. Live
            train positions on the geographic map are a demo on this site, not
            an installable component yet. Arrivals boards, line status, line
            strips, geographic maps, colours and typography are available today.
          </Prose>
        </Section>

        <Section id={IDS.compare} title="How Board compares">
          <Prose>
            For how Board sits next to TfL Go, TubeBoard, Stationly, Home
            Assistant and physical LED boards, see the{" "}
            <TextLink href="/compare">comparison</TextLink>.
          </Prose>
        </Section>

        <Section id={IDS.faq} title="Questions">
          <dl className="max-w-prose space-y-4">
            {TFL_DASHBOARD_FAQS.map((item) => (
              <div key={item.question} className="space-y-1">
                <dt className="font-medium">{item.question}</dt>
                <dd className="text-muted-foreground">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <p className="max-w-prose text-sm text-muted-foreground">
          {SITE_INDEPENDENCE}
        </p>
      </article>
    </DocsReadableWidth>
  )
}
