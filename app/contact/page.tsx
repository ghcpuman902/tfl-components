import type { Metadata } from "next"
import { SiteProsePage } from "@/components/site-prose-page"
import { GITHUB_ISSUES_NEW, GITHUB_REPO } from "@/lib/feedback/constants"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Report a tfl-components bug, suggest a component, or ask about the project through its public issue tracker.",
  alternates: { canonical: `${SITE_URL}/contact` },
}

export default function ContactPage() {
  return (
    <SiteProsePage
      title="Contact"
      description="Use the public issue tracker for bugs, component requests, documentation problems, and questions about the project."
    >
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          Report a bug or suggest a change
        </h2>
        <p>
          Open an issue in the{" "}
          <a
            href={GITHUB_REPO}
            className="text-foreground underline underline-offset-4"
            target="_blank"
            rel="noreferrer"
          >
            tfl-components GitHub repository
          </a>
          . Include the page or registry item, the result you expected, the
          result you saw, and enough code or device detail to reproduce it. Do
          not include a TfL API key, a Board URL containing a key, or other
          private credentials. A screenshot is useful for layout faults, but
          remove personal information first.
        </p>
        <p>
          <a
            href={GITHUB_ISSUES_NEW}
            className="text-foreground underline underline-offset-4"
            target="_blank"
            rel="noreferrer"
          >
            Open a new issue
          </a>
          . Public issues make answers, workarounds, and design decisions
          available to the next person with the same problem.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          Choose the right repository
        </h2>
        <p>
          Use tfl-components for the hosted Board, React source, registry
          installs, visual foundations, and this website. Use the tfl-ts issue
          tracker for SDK methods, generated TfL endpoint coverage, CLI
          commands, MCP tools, or normalised data. Questions about official TfL
          data, service information, API accounts, brand permission, or Johnston
          licences belong with Transport for London rather than this independent
          project.
        </p>
      </section>
    </SiteProsePage>
  )
}
