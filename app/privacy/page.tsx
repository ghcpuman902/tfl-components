import type { Metadata } from "next";
import { SiteProsePage } from "@/components/site-prose-page";
import { VISITOR_COOKIE } from "@/lib/site-stats";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What this site stores in the browser, including TfL keys and a visitor cookie.",
};

export default function PrivacyPage() {
  return (
    <SiteProsePage
      title="Privacy"
      description="This site stores a few things in your browser so demos and personal boards can work. It does not run a third-party analytics SDK."
    >
      <section className="space-y-2">
        <h2 id="keys" className="text-lg font-semibold text-foreground">
          TfL API keys
        </h2>
        <p>
          If you paste a key for live demos, it stays in this browser under{" "}
          <code className="text-xs">tfl-user-api-key.v1</code>.
          You can keep it for later visits or limit it to the current tab. Clear
          it from the same dialog that saved it.
        </p>
        <p>
          A Board URL can carry the key in the hash fragment after{" "}
          <code className="text-xs">#</code>. The hash is not sent to this
          site&apos;s server. Anyone who opens that URL can use the key, so
          treat a shared Board link as secret if it includes one.
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
    </SiteProsePage>
  );
}
