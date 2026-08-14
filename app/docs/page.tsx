import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRightIcon, RocketIcon } from "lucide-react";
import { BrowserWindow } from "@/components/docs/browser-window";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { SyntaxHighlightedCode } from "@/components/docs/syntax-highlighted-code";
import {
  RailArrivalsBoard,
  RailArrivalsBoardSkeleton,
} from "@/components/tfl/arrivals/rail-arrivals-board";
import { newMarkerParentClassName } from "@/components/new-marker";
import { getDocsEntry } from "@/lib/docs-catalog";
import { TFL_BRAND_LINKS } from "@/lib/tfl/brand";
import {
  getCachedHomeRailArrivals,
  HOME_RAIL_LINES,
  readHomeArrivalsBoardState,
} from "@/lib/tfl/home-arrivals-data";

const TFL_KEY_SNIPPET = `TFL_APP_KEY=your-primary-or-secondary-key`;
const ARRIVALS_INSTALL_SNIPPET =
  "pnpm dlx shadcn@latest add https://tfl.manglekuo.com/r/rail-arrivals-board.json";
const ARRIVALS_PAGE_SNIPPET = `import TflClient from "tfl-ts"
import { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board"

const tfl = new TflClient({
  appKey: process.env.TFL_APP_KEY!,
})

export default async function Page() {
  const data = await tfl.stopPoint.getArrivals({
    stopPointIds: ["940GZZLUOXC"],
    sortBy: "timeToStation",
  })

  return (
    <RailArrivalsBoard data={data} stopName="Oxford Circus" />
  )
}`;

export const metadata: Metadata = {
  title: "Introduction",
  description:
    "Web components for your TfL projects. Use them with tfl-ts for live data, or alone for the look.",
};

const TFL_API_PORTAL = "https://api-portal.tfl.gov.uk/";

const ExternalTextLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <a
    href={href}
    className="text-foreground underline underline-offset-4"
    target="_blank"
    rel="noopener noreferrer"
  >
    {children}
  </a>
);

const IntroArrivalsFallback = () => (
  <BrowserWindow>
    <RailArrivalsBoardSkeleton stopName="Oxford Circus" />
  </BrowserWindow>
);

const IntroArrivalsPreview = async () => {
  const payload = await getCachedHomeRailArrivals();
  const boardState = await readHomeArrivalsBoardState(payload, "rail");

  return (
    <BrowserWindow>
      <RailArrivalsBoard
        data={payload.arrivals}
        lines={HOME_RAIL_LINES}
        stopName={payload.stopName}
        headingLevel={2}
        error={boardState.error}
        emptyKind={boardState.emptyKind}
      />
    </BrowserWindow>
  );
};

export default function DocsIntroductionPage() {
  const entry = getDocsEntry("introduction")!;

  return (
    <DocsReadableWidth>
      <article className="space-y-12">
        <DocsPageHeader entry={entry} />

        <section className="space-y-3">
          <h2 id="get-a-key" className="text-lg font-semibold">
            1. Get a free TfL key from the{" "}
            <ExternalTextLink href={TFL_API_PORTAL}>
              TfL API portal
            </ExternalTextLink>
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Add to your <code className="text-xs">.env</code> /{" "}
            <code className="text-xs">.env.local</code> /{" "}
            <code className="text-xs">.env.development</code>.
          </p>
          <SyntaxHighlightedCode
            code={TFL_KEY_SNIPPET}
            language="bash"
            wrapperClassName="mt-0 mb-0"
          />
          <p className="max-w-prose text-xs text-muted-foreground">
            You only need one of the two keys (Primary or Secondary).{" "}
            <code className="text-[0.7rem]">app_id</code> has been unused since
            Jan 2021.
          </p>
        </section>

        <aside className="grid grid-cols-[auto_minmax(0,1fr)] items-stretch gap-4">
          <div className="relative aspect-square h-full overflow-hidden rounded-xl bg-muted">
            <RocketIcon
              className="pointer-events-none absolute top-1/2 left-1/2 size-[140%] -translate-x-1/2 -translate-y-1/2 text-background"
              strokeWidth={2.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            />
          </div>
          <div className="min-w-0 space-y-2">
            <h2
              id="hosted-url"
              className={newMarkerParentClassName(
                "inline-block pr-8 text-lg font-semibold after:top-0.5 after:text-sm"
              )}
            >
              Board
            </h2>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              Wait, do you really need a server? Board is the quickest way to
              turn an old iPad or tablet into a TfL dashboard. Once you have a
              key, configure a single URL that opens a full-screen page for a
              common use case.
            </p>
            <Link
              href="/board"
              className="inline-flex w-fit items-center gap-1.5 text-sm text-primary underline underline-offset-4"
            >
              Config your own board
              <ArrowRightIcon className="size-3.5 shrink-0" aria-hidden />
            </Link>
          </div>
        </aside>

        <section className="space-y-3">
          <h2 id="optional-type" className="text-lg font-semibold">
            2. Set up a typeface (optional)
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Skip this and components use your app’s font. For the TfL-inspired
            look, start with{" "}
            <Link
              href="/docs/typography"
              className="text-foreground underline underline-offset-4"
            >
              Hammersmith One
            </Link>
            . Official Johnston requires a licence from{" "}
            <ExternalTextLink href={TFL_BRAND_LINKS.fontRequests}>
              TfL
            </ExternalTextLink>
            ; see{" "}
            <Link
              href="/docs/tfl-licensing"
              className="text-foreground underline underline-offset-4"
            >
              Licensing and brand use
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="install-and-import" className="text-lg font-semibold">
            3. Install and import
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Start with the Tube and rail arrivals board. The command copies its
            source and dependencies into your app:
          </p>
          <SyntaxHighlightedCode
            code={ARRIVALS_INSTALL_SNIPPET}
            language="bash"
            wrapperClassName="mt-0 mb-0"
          />
          <p className="max-w-prose text-muted-foreground">
            Fetch predictions with{" "}
            <ExternalTextLink href="https://www.npmjs.com/package/tfl-ts">
              tfl-ts
            </ExternalTextLink>{" "}
            and render them from a page:
          </p>
          <SyntaxHighlightedCode
            code={ARRIVALS_PAGE_SNIPPET}
            language="tsx"
            wrapperClassName="mt-0 mb-0"
          />
          <figure className="space-y-3 pt-3">
            <Suspense fallback={<IntroArrivalsFallback />}>
              <IntroArrivalsPreview />
            </Suspense>
            <figcaption className="text-sm text-muted-foreground">
              Oxford Circus, live.{" "}
              <Link
                href="/docs/tube-rail-arrivals"
                className="text-foreground underline underline-offset-4"
              >
                Tube and rail arrivals guide
              </Link>{" "}
              covers grouping, paging, and layouts.
            </figcaption>
          </figure>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
