import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { BrowserWindow } from "@/components/docs/browser-window";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { InstallCommand } from "@/components/docs/install-command";
import { SyntaxHighlightedCode } from "@/components/docs/syntax-highlighted-code";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const ARRIVALS_REACT_SNIPPET = `import { useEffect, useState } from "react"
import TflClient, { type RealtimePrediction } from "tfl-ts"
import { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board"

const tfl = new TflClient({ appKey: import.meta.env.VITE_TFL_APP_KEY })

export default function Page() {
  const [data, setData] = useState<RealtimePrediction[]>([])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const arrivals = await tfl.stopPoint.getArrivals({
        stopPointIds: ["940GZZLUOXC"],
        sortBy: "timeToStation",
      })
      if (!cancelled) setData(arrivals)
    }

    void load()
    const id = setInterval(load, 20_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return <RailArrivalsBoard data={data} stopName="Oxford Circus" />
}`;

const ARRIVALS_ACTION_SNIPPET = `"use server"

import TflClient from "tfl-ts"

const tfl = new TflClient({ appKey: process.env.TFL_APP_KEY! })

export async function getArrivals() {
  return tfl.stopPoint.getArrivals({
    stopPointIds: ["940GZZLUOXC"],
    sortBy: "timeToStation",
  })
}`;

const ARRIVALS_ACTION_PAGE_SNIPPET = `"use client"

import { useEffect, useState } from "react"
import type { RealtimePrediction } from "tfl-ts"
import { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board"
import { getArrivals } from "./actions"

export default function Page() {
  const [data, setData] = useState<RealtimePrediction[]>([])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const arrivals = await getArrivals()
      if (!cancelled) setData(arrivals)
    }

    void load()
    const id = setInterval(load, 20_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return <RailArrivalsBoard data={data} stopName="Oxford Circus" />
}`;

const ARRIVALS_ROUTE_SNIPPET = `import TflClient from "tfl-ts"

const tfl = new TflClient({ appKey: process.env.TFL_APP_KEY! })
const ALLOWED_ORIGIN = "https://your-app.example.com"

export async function GET(request: Request) {
  const origin = request.headers.get("origin")
  const data = await tfl.stopPoint.getArrivals({
    stopPointIds: ["940GZZLUOXC"],
    sortBy: "timeToStation",
  })
  return Response.json(data, {
    headers:
      origin === ALLOWED_ORIGIN
        ? { "Access-Control-Allow-Origin": ALLOWED_ORIGIN, Vary: "Origin" }
        : { Vary: "Origin" },
  })
}`;

const ARRIVALS_ROUTE_PAGE_SNIPPET = `"use client"

import { useEffect, useState } from "react"
import type { RealtimePrediction } from "tfl-ts"
import { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board"

export default function Page() {
  const [data, setData] = useState<RealtimePrediction[]>([])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const arrivals = (await fetch("/api/arrivals").then((response) =>
        response.json(),
      )) as RealtimePrediction[]
      if (!cancelled) setData(arrivals)
    }

    void load()
    const id = setInterval(load, 20_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return <RailArrivalsBoard data={data} stopName="Oxford Circus" />
}`;

export const metadata: Metadata = {
  title: "Introduction",
  description:
    "Web components for your TfL projects. Use them with tfl-ts for live data, or alone for the look.",
};

const TFL_API_PORTAL = "https://api-portal.tfl.gov.uk/";

const BoardIpadMark = () => (
  <div
    className="@container flex h-full flex-col w-full"
    aria-hidden
  >
    <div className="flex aspect-square w-full shrink-0 items-end justify-center">
      <div className="flex aspect-[134.7/200] h-full flex-col items-center rounded-[8cqw] bg-neutral-800 px-[5cqw]">
        <div className="flex h-[10cqw] w-full items-center justify-center">
          <div className="w-[1.6cqw] h-[1.6cqw] rounded-full bg-white" />
        </div>
        <div className="w-full flex-1 bg-white" />
        <div className="flex h-[10cqw] w-full items-center justify-center">
          <div className="w-[5.4cqw] h-[5.4cqw] rounded-full border-[0.5cqw] border-white" />
        </div>
      </div>
    </div>
    <div className="flex min-h-0 flex-1 flex-col items-center">
      <div className="h-[6cqw] w-[3.2cqw] rounded-[0.6cqw] bg-neutral-300" />
      <div className="min-h-0 w-[0.9cqw] flex-1 bg-neutral-300 shadow-[0_10cqw_0_0_var(--color-neutral-300),0_50cqw_0_0_var(--color-neutral-300)]" />
    </div>
  </div>
);

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
  const arrivalsEntry = getDocsEntry("tube-rail-arrivals")!;

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
            Subscribe to 500 Requests per min, then copy Primary or Secondary
            from Profile into <code className="text-xs">.env.local</code>.{" "}
            NOTE:{" "} 
            <code className="text-xs">app_id</code> has been unused since Jan
            2021.
          </p>
          <SyntaxHighlightedCode
            code={TFL_KEY_SNIPPET}
            language="bash"
            wrapperClassName="mt-0 mb-0"
          />
        </section>

        <aside className="@container max-w-2xl overflow-hidden ring-1 ring-neutral-200 rounded-3xl p-4">
          <div className="grid gap-4 grid-cols-[5rem_minmax(0,1fr)]">
            <BoardIpadMark />
            <div className="min-w-0 space-y-2">
              <h2
                id="hosted-url"
                className={newMarkerParentClassName(
                  "inline-block pr-8 text-lg font-semibold after:-top-3 after:text-sm"
                )}
              >
                Board
              </h2>
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
               You don&apos;t need to self host these components! Get a live arrival board running on your old iPad in less than 2 mins! 
                Full screen, auto refresh, no installation, works on any device with a browser!
              </p>
              <Link
                href="/board"
                className="inline-flex w-fit items-center gap-1.5 text-sm text-primary underline underline-offset-4"
              >
                Try it
                <ArrowRightIcon className="size-3.5 shrink-0" aria-hidden />
              </Link>
            </div>
          </div>
        </aside>

        <section className="space-y-3">
          <h2 id="optional-type" className="text-lg font-semibold">
            2. Set up a typeface (optional)
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Components use your app&apos;s font by default. 
            The official Johnston font requires a licence from{" "}
            <ExternalTextLink href={TFL_BRAND_LINKS.fontRequests}>
              TfL
            </ExternalTextLink>
            {" "}(see{" "}
            <Link
              href="/docs/tfl-licensing"
              className="text-foreground underline underline-offset-4"
            >
              Licensing and brand use
            </Link>
            ).
            
            This site uses the free TfL-inspired{" "}
            <Link
              href="/docs/typography"
              className="text-foreground underline underline-offset-4"
            >
              Hammersmith One
            </Link>
            . Or if you have Adobe subscription, a closer match is P22 Underground,
            see <Link href="/docs/typography" className="text-foreground underline underline-offset-4">Typography</Link> for more details.
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="install-and-import" className="text-lg font-semibold">
            3. Install and render
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Start from a Next.js app with{" "}
            <ExternalTextLink href="https://ui.shadcn.com/docs/installation/next">
              shadcn already initialised
            </ExternalTextLink>
            . The command copies the board source into your repo and installs{" "}
            <ExternalTextLink href="https://www.npmjs.com/package/tfl-ts">
              tfl-ts
            </ExternalTextLink>
            .
          </p>
          <InstallCommand registryUrl={arrivalsEntry.registryUrl!} />
          <Tabs defaultValue="react" className="gap-2">
            <TabsList variant="line" className="h-8">
              <TabsTrigger value="react">React</TabsTrigger>
              <TabsTrigger value="action">Next.js (Server Action)</TabsTrigger>
              <TabsTrigger value="route">Next.js (Route Handler)</TabsTrigger>
            </TabsList>
            <TabsContent value="react" className="space-y-3">
              <p className="max-w-prose text-sm text-muted-foreground">
                (Quick and easy) Calls TfL from the browser, AKA client side. Anyone can right click dev tools and see your TfL key.
              </p>
              <SyntaxHighlightedCode
                code={ARRIVALS_REACT_SNIPPET}
                language="tsx"
                wrapperClassName="mt-0 mb-0"
              />
            </TabsContent>
            <TabsContent value="action" className="space-y-3">
              <p className="max-w-prose text-sm text-muted-foreground">
                (Recommended) Use Next.js&apos;s{" "}
                <Link 
                  href="https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions" 
                  className="text-foreground underline underline-offset-4"
                >
                  Server Actions
                </Link>{" "}
                to call TfL from the server. This is more secure as the key stays on the server. To fully prevent abuse, consider implementing IP whitelisting or API key authentication.
              </p>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">app/actions.ts</p>
                <SyntaxHighlightedCode
                  code={ARRIVALS_ACTION_SNIPPET}
                  language="ts"
                  wrapperClassName="mt-0 mb-0"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">app/page.tsx</p>
                <SyntaxHighlightedCode
                  code={ARRIVALS_ACTION_PAGE_SNIPPET}
                  language="tsx"
                  wrapperClassName="mt-0 mb-0"
                />
              </div>
            </TabsContent>
            <TabsContent value="route" className="space-y-3">
              <p className="max-w-prose text-sm text-muted-foreground">
                This method expose an API endpoint (<code className="text-xs">/api/arrivals</code>) anyone can call, here we demostrated how to add security with CORS,
                to fully prevent abuse, consider implementing IP whitelisting or API key authentication.
              </p>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  app/api/arrivals/route.ts
                </p>
                <SyntaxHighlightedCode
                  code={ARRIVALS_ROUTE_SNIPPET}
                  language="ts"
                  wrapperClassName="mt-0 mb-0"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">app/page.tsx</p>
                <SyntaxHighlightedCode
                  code={ARRIVALS_ROUTE_PAGE_SNIPPET}
                  language="tsx"
                  wrapperClassName="mt-0 mb-0"
                />
              </div>
            </TabsContent>
          </Tabs>
          <figure className="space-y-3 pt-3">
            <p className="text-sm text-muted-foreground">
              You should see something like this:
            </p>
            <Suspense fallback={<IntroArrivalsFallback />}>
              <IntroArrivalsPreview />
            </Suspense>
            <p className="text-sm text-muted-foreground">
              Still having trouble? See{" "}
              <Link
                href="/docs/troubleshoot"
                className="text-foreground underline underline-offset-4"
              >
                Troubleshoot
              </Link>
              .
            </p>
          </figure>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
