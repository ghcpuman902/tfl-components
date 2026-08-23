import Link from "next/link"

const SURFACES = [
  {
    title: "Board",
    href: "/board",
    body: "Set up a live London transport display without deploying an app. Choose a stop and show arrivals, line status, buses, and nearby cycle hire on an iPad, tablet, monitor, or any screen with a modern browser.",
  },
  {
    title: "tfl-components",
    href: "/docs/components",
    body: "Install the React source behind the demos through the shadcn registry. The catalogue covers arrivals and status boards, maps, line diagrams, station labels, route chips, colour tokens, and other parts for a custom TfL interface.",
  },
  {
    title: "tfl-ts, CLI, and MCP",
    href: "https://www.npmjs.com/package/tfl-ts",
    body: "Use the typed tfl-ts client for TfL Unified API data and static station information. The same npm package includes the tfl command-line tool and a read-only MCP server that lets coding agents inspect TfL data with your own API key.",
  },
  {
    title: "TfL interface foundations",
    href: "/docs/colors",
    body: "Check the published colour references, typography and Johnston licensing, station-name fitting, icons, roundel boundaries, and line-diagram conventions before copying the visual language into a product.",
  },
] as const

const SurfaceLink = ({ href, title }: { href: string; title: string }) =>
  href.startsWith("http") ? (
    <a
      href={href}
      className="underline underline-offset-4"
      target="_blank"
      rel="noreferrer"
    >
      {title}
    </a>
  ) : (
    <Link href={href} className="underline underline-offset-4">
      {title}
    </Link>
  )

/** Static homepage copy kept outside the request-dependent landing boundary. */
export const AgentReadableHome = () => (
  <section
    aria-labelledby="home-contains"
    className="mx-auto w-full max-w-6xl border-y border-border px-4 py-10 md:px-8 md:py-12"
  >
    <div className="max-w-3xl">
      <h1 id="home-contains" className="tfl-title text-3xl text-foreground">
        TfL boards, React components, and typed transport data
      </h1>
      <p className="mt-3 text-muted-foreground">
        Start with the hosted Board, take the React components into your own
        app, or work directly with tfl-ts. The reference pages cover the TfL
        conventions that hold those routes together.
      </p>
    </div>
    <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
      {SURFACES.map((surface) => (
        <article key={surface.title} className="max-w-prose">
          <h2 className="text-lg font-semibold text-foreground">
            <SurfaceLink href={surface.href} title={surface.title} />
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {surface.body}
          </p>
        </article>
      ))}
    </div>
  </section>
)
