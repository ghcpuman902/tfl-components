import type { Metadata } from "next"
import Link from "next/link"
import { SiteProsePage } from "@/components/site-prose-page"
import {
  BOARD_ROW,
  COMPARE_ALTERNATIVES,
  COMPARE_CHECKED_ON,
  type CompareAlternative,
} from "@/lib/compare/alternatives"
import { SITE_INDEPENDENCE } from "@/lib/site"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"

export const metadata: Metadata = pageMetadata(ROUTE_PAGE_META.compare)

const LINK_CLASS = "text-foreground underline underline-offset-4"

const FIELDS = [
  ["What it is", "kind"],
  ["Runs on", "runsOn"],
  ["Cost", "cost"],
  ["TfL data", "tflData"],
  ["Good fit for", "goodFit"],
] as const satisfies readonly (readonly [string, keyof CompareAlternative])[]

const SourceLink = ({ label, url }: { label: string; url: string }) =>
  url.startsWith("/") ? (
    <Link href={url} className={LINK_CLASS}>
      {label}
    </Link>
  ) : (
    <a
      href={url}
      className={LINK_CLASS}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
  )

const AlternativeSection = ({ item }: { item: CompareAlternative }) => (
  <section aria-labelledby={`compare-${item.id}`} className="space-y-3">
    <h2
      id={`compare-${item.id}`}
      className="text-lg font-semibold text-foreground"
    >
      {item.name}
    </h2>
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[9rem_1fr]">
      {FIELDS.map(([label, key]) => (
        <div key={key} className="contents">
          <dt className="font-medium text-foreground">{label}</dt>
          <dd>{item[key] as string}</dd>
        </div>
      ))}
      <dt className="font-medium text-foreground">Sources</dt>
      <dd>
        {item.sources.map((source, index) => (
          <span key={source.url}>
            {index > 0 ? " · " : null}
            <SourceLink label={source.label} url={source.url} />
          </span>
        ))}
      </dd>
    </dl>
  </section>
)

export default function ComparePage() {
  return (
    <SiteProsePage
      title="Board compared with other London departure displays"
      description="TfL Go, Stationly, TubeBoard, Home Assistant, DAKboard, a DIY Raspberry Pi build and Desktop Departures, side by side with Board."
    >
      <p>
        Each does a different job. Phone apps are for the screen in your hand.
        Physical boards are objects you buy or build. Board is a web page you
        leave open on a screen you already own. Details below come from each
        product&apos;s own pages, checked on {COMPARE_CHECKED_ON}. Prices and
        features change, so follow the source links before you buy.
      </p>

      <AlternativeSection item={BOARD_ROW} />
      {COMPARE_ALTERNATIVES.map((item) => (
        <AlternativeSection key={item.id} item={item} />
      ))}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Set one up</h2>
        <p>
          For an old iPad, see the{" "}
          <Link href="/docs/ipad-dashboard" className={LINK_CLASS}>
            iPad wall display
          </Link>{" "}
          guide. For a television or monitor, see{" "}
          <Link href="/docs/tv" className={LINK_CLASS}>
            Board on a TV
          </Link>
          . Spotted something out of date?{" "}
          <Link href="/contact" className={LINK_CLASS}>
            Tell us
          </Link>
          .
        </p>
      </section>

      <p>
        {SITE_INDEPENDENCE} Product names belong to their owners; no endorsement
        is implied.
      </p>
    </SiteProsePage>
  )
}
