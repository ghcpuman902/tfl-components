import type { Metadata } from "next"
import Link from "next/link"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { WipNotice } from "@/components/docs/wip-notice"
import { getDocsEntry, getEntriesByGroup } from "@/lib/docs-catalog"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"

export const metadata: Metadata = pageMetadata(ROUTE_PAGE_META.labs)

const WeekAheadPreview = () => (
  <div className="flex h-full items-center justify-center gap-2" aria-hidden>
    {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
      <div key={`${day}-${index}`} className="grid justify-items-center gap-2">
        <span className="text-xs text-muted-foreground">{day}</span>
        <span
          className="h-16 w-2 rounded-full"
          style={{
            background:
              index === 5
                ? "linear-gradient(to bottom, var(--tfl-line-victoria) 0 45%, var(--muted-foreground) 45% 62%, var(--tfl-line-victoria) 62%)"
                : "var(--tfl-line-victoria)",
          }}
        />
      </div>
    ))}
  </div>
)

const BranchAtlasPreview = () => (
  <svg viewBox="0 0 320 150" className="h-full w-full" aria-hidden>
    <g
      fill="none"
      stroke="var(--tfl-line-district)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="8"
    >
      <path d="M22 76h118c32 0 38-40 70-40h88" />
      <path d="M140 76h158" />
      <path d="M140 76c32 0 38 40 70 40h88" />
    </g>
    {[22, 72, 122].map((x) => (
      <circle key={x} cx={x} cy="76" r="5" fill="var(--background)" />
    ))}
    {[
      [210, 36],
      [258, 36],
      [190, 76],
      [246, 76],
      [210, 116],
      [258, 116],
      [298, 36],
      [298, 76],
      [298, 116],
    ].map(([x, y]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="var(--background)" />
    ))}
  </svg>
)

const LineLanguagesPreview = () => (
  <div className="flex h-full flex-col justify-center gap-7 px-3" aria-hidden>
    <div className="space-y-2">
      <div className="h-2 rounded-full bg-[var(--tfl-line-victoria)]" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Oxford Circus</span>
        <span>Victoria</span>
      </div>
    </div>
    <div className="space-y-2" lang="ja">
      <div className="h-2 rounded-full bg-[var(--tfl-line-victoria)]" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>オックスフォード・サーカス</span>
        <span>ヴィクトリア</span>
      </div>
    </div>
  </div>
)

const RING_COLOURS = [
  "var(--tfl-line-victoria)",
  "var(--tfl-line-central)",
  "var(--tfl-line-circle)",
  "var(--tfl-line-district)",
  "var(--tfl-line-metropolitan)",
  "var(--tfl-line-piccadilly)",
] as const

const NetworkRingsPreview = () => (
  <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
    {RING_COLOURS.map((colour, index) => (
      <circle
        key={colour}
        cx="100"
        cy="100"
        r={25 + index * 12}
        fill="none"
        stroke={colour}
        strokeWidth="4"
      />
    ))}
  </svg>
)

const LAB_PREVIEWS: Record<string, React.ReactNode> = {
  "week-ahead": <WeekAheadPreview />,
  "branch-atlas": <BranchAtlasPreview />,
  "line-languages": <LineLanguagesPreview />,
  "network-rings": <NetworkRingsPreview />,
}

export default function LabsIndexPage() {
  const entry = getDocsEntry("blocks-index")!
  const labs = getEntriesByGroup("blocks").filter(
    (item) => item.kind === "block"
  )

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader
          entry={entry}
          notice={
            <WipNotice className="mt-4">
              These experiments may change or disappear before version 1.0.
            </WipNotice>
          }
        />

        <section aria-label="Labs">
          <ul className="grid gap-4 sm:grid-cols-2">
            {labs.map((lab) => (
              <li key={lab.slug}>
                <Link
                  href={lab.href}
                  className="group block h-full overflow-hidden rounded-xl border border-border bg-card hover:border-foreground/30 hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <div className="aspect-[16/9] border-b border-border bg-muted/25 p-4">
                    {LAB_PREVIEWS[lab.slug]}
                  </div>
                  <div className="space-y-1 p-4">
                    <h2 className="tfl-title text-lg text-foreground group-hover:underline group-hover:underline-offset-4">
                      {lab.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {lab.description}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="max-w-prose text-sm text-muted-foreground">
          Each Lab combines several components around one idea. Treat the result
          as a starting point, not a single installable component.
        </p>
      </article>
    </DocsReadableWidth>
  )
}
