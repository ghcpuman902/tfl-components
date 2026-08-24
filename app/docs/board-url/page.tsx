import type { Metadata } from "next"
import Link from "next/link"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { SyntaxHighlightedCode } from "@/components/docs/syntax-highlighted-code"
import { TFL_API_PORTAL_PRODUCT_URL } from "@/components/user-tfl-api-key-copy"
import { getDocsEntry } from "@/lib/docs-catalog"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"
import {
  BOARD_URL_COMPLETE_EXAMPLE,
  BOARD_URL_EXAMPLES,
  BOARD_URL_IGNORED_PARAMS,
  BOARD_URL_PATH,
  getBoardUrlParamSpecs,
} from "@/lib/tfl/board-url-spec"

export const metadata: Metadata = pageMetadata(ROUTE_PAGE_META.boardUrl)

const ExampleBlock = ({
  label,
  href,
}: {
  label: string
  href: string
}) => (
  <div className="space-y-1.5">
    <p className="text-sm font-medium text-foreground">{label}</p>
    <SyntaxHighlightedCode
      code={href}
      language="text"
      wrapperClassName="mt-0 mb-0"
    />
  </div>
)

export default function BoardUrlSpecPage() {
  const entry = getDocsEntry("board-url")!
  const params = getBoardUrlParamSpecs()

  return (
    <DocsReadableWidth>
      <article className="space-y-10">
        <DocsPageHeader entry={entry} />

        <section className="space-y-3">
          <h2 id="purpose" className="text-lg font-semibold">
            Purpose
          </h2>
          <p className="max-w-prose text-muted-foreground">
            A hosted Board is a full-screen display at{" "}
            <code className="text-xs">{BOARD_URL_PATH}</code>. The fragment
            lists the stop, services, and optional TfL key. The query string is
            not read for configuration. For an iPad on a stand, see{" "}
            <Link
              href="/docs/ipad-dashboard"
              className="text-foreground underline underline-offset-4"
            >
              iPad wall display
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="complete-example" className="text-lg font-semibold">
            Complete example
          </h2>
          <SyntaxHighlightedCode
            code={BOARD_URL_COMPLETE_EXAMPLE}
            language="text"
            wrapperClassName="mt-0 mb-0"
          />
        </section>

        <section className="space-y-3">
          <h2 id="query-vs-fragment" className="text-lg font-semibold">
            Query vs fragment
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Every setting is a hash parameter. The key is never placed in the
            query, so it is not sent to this origin when the page loads.
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="parameters" className="text-lg font-semibold">
            Parameters
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-xl border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Param</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Default</th>
                  <th className="py-2 pr-3 font-medium">Required</th>
                  <th className="py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {params.map((item) => (
                  <tr key={item.param} className="border-b border-border">
                    <td className="py-2 pr-3 font-mono text-xs">{item.param}</td>
                    <td className="py-2 pr-3">{item.type}</td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {item.defaultLabel}
                    </td>
                    <td className="py-2 pr-3">
                      {item.required ? "Required" : "Optional"}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {item.label}
                      {item.help ? `. ${item.help}` : ""}
                      {item.repeated ? " Repeated values are comma lists." : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="max-w-prose text-sm text-muted-foreground">
            Ignored legacy params: {BOARD_URL_IGNORED_PARAMS.join(", ")}. Unknown
            params are kept when the hash is normalised.
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="stop-and-services" className="text-lg font-semibold">
            Stop and services
          </h2>
          <p className="max-w-prose text-muted-foreground">
            <code className="text-xs">stop</code> is one rail StopPoint. Bus,
            river, and cycle ids use <code className="text-xs">b.stop</code>,{" "}
            <code className="text-xs">r.stop</code>, and{" "}
            <code className="text-xs">c.docks</code>.{" "}
            <code className="text-xs">p1</code> and{" "}
            <code className="text-xs">p2</code> choose panels.{" "}
            <code className="text-xs">a.lines</code> and{" "}
            <code className="text-xs">s.lines</code> are comma-separated line
            ids; order is first-wins and unknown ids are dropped.
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="screen-and-layout" className="text-lg font-semibold">
            Screen and layout
          </h2>
          <p className="max-w-prose text-muted-foreground">
            There is no screen or orientation parameter. The board follows the
            viewport. Portrait and small screens use the same fragment as a
            landscape board.
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="invalid-and-compatibility" className="text-lg font-semibold">
            Invalid values and compatibility
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Invalid values fall back to defaults. The parser does not throw.
            There is no version parameter. Legacy{" "}
            <code className="text-xs">mode</code> maps to interactive behaviour.
            Unknown params stay in the fragment so newer boards can keep working
            on older pages.
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="sharing-and-keys" className="text-lg font-semibold">
            Sharing and TfL keys
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Copy the full address from the Board builder, or build one from
            these parameters. If the fragment includes{" "}
            <code className="text-xs">key</code>, anyone who opens the link can
            use that key and its request quota. Treat the complete link as a
            secret. Get a key from the{" "}
            <a
              href={TFL_API_PORTAL_PRODUCT_URL}
              className="text-foreground underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              TfL API portal
            </a>
            .
          </p>
        </section>

        <section className="space-y-4">
          <h2 id="examples" className="text-lg font-semibold">
            Copyable examples
          </h2>
          <ExampleBlock
            label="Arrivals and status"
            href={BOARD_URL_EXAMPLES.arrivalsAndStatus}
          />
          <ExampleBlock
            label="Arrivals only"
            href={BOARD_URL_EXAMPLES.arrivalsOnly}
          />
          <ExampleBlock
            label="Status only"
            href={BOARD_URL_EXAMPLES.statusOnly}
          />
          <ExampleBlock
            label="Network status, no stop"
            href={BOARD_URL_EXAMPLES.noStopStatus}
          />
          <ExampleBlock
            label="Portrait or small screen"
            href={BOARD_URL_EXAMPLES.portraitSmallScreen}
          />
        </section>

        <p className="text-sm text-muted-foreground">
          Set one up in the{" "}
          <Link
            href="/board"
            className="text-foreground underline underline-offset-4"
          >
            Board builder
          </Link>
          , or start from{" "}
          <Link
            href="/docs"
            className="text-foreground underline underline-offset-4"
          >
            Get started
          </Link>
          .
        </p>
      </article>
    </DocsReadableWidth>
  )
}
