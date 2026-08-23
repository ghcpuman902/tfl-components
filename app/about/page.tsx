import type { Metadata } from "next"
import Link from "next/link"
import { SiteProsePage } from "@/components/site-prose-page"
import { SITE_AUTHOR, SITE_INDEPENDENCE, SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "About",
  description:
    "What tfl-components contains, who makes it, and how Board, the React registry, and tfl-ts fit together.",
  alternates: { canonical: `${SITE_URL}/about` },
}

export default function AboutPage() {
  return (
    <SiteProsePage
      title="About tfl-components"
      description="A hosted transport board, installable React source, and practical references for London transport interfaces."
    >
      <p>
        tfl-components is designed and maintained by{" "}
        <a
          href={SITE_AUTHOR.url}
          className="text-foreground underline underline-offset-4"
          rel="author"
        >
          {SITE_AUTHOR.name}
        </a>
        . It began as a way to stop rebuilding the same arrivals rows, line
        colours, station labels, and route diagrams for every London transport
        project. The source is public, and the component registry copies React
        files into the app that installs them. It is not a closed UI package.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          Three ways into the project
        </h2>
        <p>
          <Link
            href="/board"
            className="text-foreground underline underline-offset-4"
          >
            Board
          </Link>{" "}
          is the hosted route. It turns an iPad, tablet, monitor, or spare
          screen into a live arrivals and status display without an app
          deployment. The{" "}
          <Link
            href="/docs/components"
            className="text-foreground underline underline-offset-4"
          >
            component catalogue
          </Link>{" "}
          is for custom React interfaces. tfl-ts is the separate typed data
          client underneath the examples; its npm package also ships the tfl CLI
          and a read-only MCP server.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          TfL references and limits
        </h2>
        <p>
          The foundations pages record colour values, typography choices,
          station-name behaviour, icons, diagrams, and licensing boundaries.
          They help a developer make a correct implementation, but they do not
          grant rights to Johnston, the roundel, or other protected TfL assets.
          Source-code licensing and brand permission are separate questions.
        </p>
        <p>{SITE_INDEPENDENCE}</p>
      </section>
    </SiteProsePage>
  )
}
