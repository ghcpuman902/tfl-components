import type { Metadata } from "next"
import Link from "next/link"
import { SiteProsePage } from "@/components/site-prose-page"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"
import { VISITOR_COOKIE } from "@/lib/site-stats"

export const metadata: Metadata = pageMetadata(ROUTE_PAGE_META.privacy)

export default function PrivacyPage() {
  return (
    <SiteProsePage
      title="Privacy"
      description="This site stores a few things in your browser so boards can work, and loads P22 Underground from Adobe Fonts."
    >
      <section className="space-y-2">
        <h2 id="keys" className="text-lg font-semibold text-foreground">
          TfL API keys
        </h2>
        <p>
          If you paste a key for live demos, it stays in this browser under{" "}
          <code className="text-xs">tfl-user-api-key.v1</code>. You can keep it
          for later visits or limit it to the current tab. Clear it from the
          same dialog that saved it.
        </p>
        <p>
          Boards offer two key modes. <strong>Save key on this browser</strong>{" "}
          stores the key in this browser and omits it from generated Board URLs
          and QR codes. Another device will need its own key entry.
        </p>
        <p>
          If that option is off, the Board URL includes the key in the hash
          fragment after <code className="text-xs">#</code>. This is a portable
          setup option for another tablet or unattended display. The hash is not
          sent to this site&apos;s server, logs, analytics, or referrers. Anyone
          with the complete link can use the key and its quota.
        </p>
        <p>
          Keys are not sent to logs, analytics, or unrelated services from this
          app. Validation talks to api.tfl.gov.uk from the browser.
        </p>
      </section>

      <section className="space-y-2">
        <h2 id="visitor" className="text-lg font-semibold text-foreground">
          Visitor count
        </h2>
        <p>
          A first-party cookie named{" "}
          <code className="text-xs">{VISITOR_COOKIE}</code> deduplicates the
          footer visitor count. It is a random id, not a login. Clearing site
          data removes it.
        </p>
      </section>

      <section className="space-y-2">
        <h2 id="fonts" className="text-lg font-semibold text-foreground">
          Fonts
        </h2>
        <p>
          This site loads P22 Underground from Adobe Fonts (
          <code className="text-xs">use.typekit.net</code>). Switch to
          Hammersmith One on{" "}
          <Link
            href="/docs/typography"
            className="underline underline-offset-4"
          >
            Typography
          </Link>{" "}
          to stop that request. Hammersmith One ships with the page.
        </p>
      </section>

      <section className="space-y-2">
        <h2 id="local" className="text-lg font-semibold text-foreground">
          Other local data
        </h2>
        <p>
          Font preference and feedback drafts can also sit in localStorage.
          Component installs and GitHub stars are counted on the server from
          registry requests and the GitHub API, not from a tracker on every
          page.
        </p>
      </section>

      <section className="space-y-2">
        <h2 id="analytics" className="text-lg font-semibold text-foreground">
          Analytics
        </h2>
        <p>
          Page views and a small set of product events (landing, Board setup,
          docs visits) go to Vercel Web Analytics. TfL keys, searches, and Board
          URLs are not included. There is no advertising tracker.
        </p>
      </section>
    </SiteProsePage>
  )
}
