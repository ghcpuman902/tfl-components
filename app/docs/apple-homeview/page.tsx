import type { ReactNode } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { getDocsEntry } from "@/lib/docs-catalog"
import { SITE_INDEPENDENCE } from "@/lib/site"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"
import { BOARD_VIEW_PATH } from "@/lib/tfl/board-url-state"
import { TEXT_LINK_CLASS, TEXT_LINK_ICON_CLASS } from "@/lib/text-link"
import { cn } from "@/lib/utils"

export const metadata: Metadata = pageMetadata(ROUTE_PAGE_META.appleHomeview)

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

export default function AppleHomeviewPage() {
  const entry = getDocsEntry("apple-homeview")!

  return (
    <DocsReadableWidth>
      <article className="space-y-10">
        <DocsPageHeader
          entry={entry}
          title={ROUTE_PAGE_META.appleHomeview.title}
          description={ROUTE_PAGE_META.appleHomeview.description}
        />

        <p className="max-w-prose">
          Apple HomeView is a seven-inch square touchscreen that opens websites
          in Safari. There is no App Store on the device. Board&apos;s glance
          mode fills that tab with a few large arrivals you can read across a
          room.
        </p>

        <p>
          <Link
            href={`${BOARD_VIEW_PATH}#view=glance&behaviour=unattended`}
            className={cn(TEXT_LINK_CLASS, "font-medium text-primary")}
          >
            Open Board in glance mode
            <ArrowRightIcon
              className={cn(TEXT_LINK_ICON_CLASS, "ml-1.5")}
              aria-hidden
            />
          </Link>
        </p>

        <section className="space-y-3">
          <h2 id="what-homeview-is" className="text-lg font-semibold">
            What HomeView is
          </h2>
          <p className="max-w-prose text-muted-foreground">
            HomeView ships as a square Safari surface. Swiping down from the
            top edge opens Siri, so leave that edge free of controls. The CSS
            viewport size, device pixel ratio, WebKit build, and wake-lock
            support are not published until the hardware is in people&apos;s
            hands.
          </p>
          <p className="max-w-prose text-muted-foreground">
            Board here is a Safari tab, not a promised always-on wall
            appliance. Whether Safari stays in the foreground overnight depends
            on the device and OS, not on this site alone.
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="glance-mode" className="text-lg font-semibold">
            Glance mode in Safari
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Glance is Board&apos;s room-distance view: few next trains, large
            type, dark, fixed to the viewport. Overflow pages; it does not
            scroll. It is a viewing-distance choice, not a square-only layout —
            HomeView is just one screen that benefits from it. Turn Glance on in
            the{" "}
            <TextLink href="/board">Board builder</TextLink>, or open{" "}
            <code className="text-xs text-foreground">/homeview</code> for a
            ready hash with{" "}
            <code className="text-xs text-foreground">view=glance</code> and{" "}
            <code className="text-xs text-foreground">behaviour=unattended</code>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="after-13-nov" className="text-lg font-semibold">
            Hardware checks after 13 November
          </h2>
          <p className="max-w-prose text-muted-foreground">
            When HomeView is available, confirm these on the real device before
            treating Board as a standing hallway display:
          </p>
          <ul className="max-w-prose list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              <strong className="font-medium text-foreground">
                Foreground persistence
              </strong>{" "}
              — whether Safari keeps the Board tab visible after idle time,
              sleep, or power events.
            </li>
            <li>
              <strong className="font-medium text-foreground">
                Viewport and DPR
              </strong>{" "}
              — CSS width/height, safe areas, and device pixel ratio in that
              Safari shell.
            </li>
            <li>
              <strong className="font-medium text-foreground">
                Add to Home Screen
              </strong>{" "}
              — whether HomeView offers a home-screen / standalone launch path
              like iPad Safari.
            </li>
            <li>
              <strong className="font-medium text-foreground">Storage</strong> —
              whether local storage and an installed Board config survive
              restarts.
            </li>
            <li>
              <strong className="font-medium text-foreground">Wake Lock</strong> —
              whether the Screen Wake Lock API is present and keeps the panel
              awake while the tab is visible.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 id="related" className="text-lg font-semibold">
            Related
          </h2>
          <p className="max-w-prose text-muted-foreground">
            For an iPad on a stand, see{" "}
            <TextLink href="/docs/ipad-dashboard">iPad wall display</TextLink>.
            For every Board URL parameter, see the{" "}
            <TextLink href="/docs/board-url">Board URL</TextLink> page.
          </p>
        </section>

        <p className="max-w-prose text-sm text-muted-foreground">
          {SITE_INDEPENDENCE}
        </p>
      </article>
    </DocsReadableWidth>
  )
}
