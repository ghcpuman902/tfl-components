import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import {
  TflApiKeyField,
  TflApiKeyHelpLink,
} from "@/components/tfl-api-key-field"
import { BrowserWindow } from "@/components/docs/browser-window"
import { DocsVisitBeacon } from "@/components/docs/docs-visit-beacon"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { InstallCommand } from "@/components/docs/install-command"
import { SyntaxHighlightedCode } from "@/components/docs/syntax-highlighted-code"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RailArrivalsBoard,
  RailArrivalsBoardSkeleton,
} from "@/components/tfl/arrivals/rail-arrivals-board"
import { getDocsEntry } from "@/lib/docs-catalog"
import { readAttributionContext } from "@/lib/landing/assignment"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"
import { TFL_API_PORTAL_PRODUCT_URL } from "@/components/user-tfl-api-key-copy"
import { TFL_BRAND_LINKS } from "@/lib/tfl/brand"
import {
  getCachedHomeRailArrivals,
  HOME_RAIL_LINES,
  readHomeArrivalsBoardState,
} from "@/lib/tfl/home-arrivals-data"

const TFL_KEY_SNIPPET = `# .env.local or .env.development.local
TFL_APP_KEY=your-primary-or-secondary-key`

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
}`

const ARRIVALS_ACTION_SNIPPET = `"use server"

import TflClient from "tfl-ts"

const tfl = new TflClient({ appKey: process.env.TFL_APP_KEY! })

export async function getArrivals() {
  return tfl.stopPoint.getArrivals({
    stopPointIds: ["940GZZLUOXC"],
    sortBy: "timeToStation",
  })
}`

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
}`

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
}`

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
}`

const DocsVisitFromLanding = async () => {
  const analyticsContext = await readAttributionContext()
  return <DocsVisitBeacon context={analyticsContext} />
}

export const metadata: Metadata = pageMetadata(ROUTE_PAGE_META.docs)

const StartAction = ({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) => (
  <Link
    href={href}
    className="inline-flex items-baseline gap-1.5 font-medium text-primary underline underline-offset-4"
  >
    {children}
    <ArrowRightIcon className="size-4 shrink-0" aria-hidden />
  </Link>
)

const ExternalTextLink = ({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) => (
  <a
    href={href}
    className="text-foreground underline underline-offset-4"
    target="_blank"
    rel="noopener noreferrer"
  >
    {children}
  </a>
)

const DOCS_FULL_EXAMPLE_HREF = "/docs/tube-rail-arrivals"

const IntroArrivalsFallback = () => (
  <BrowserWindow previewLimit fullExampleHref={DOCS_FULL_EXAMPLE_HREF}>
    <RailArrivalsBoardSkeleton stopName="Oxford Circus" />
  </BrowserWindow>
)

const IntroArrivalsPreview = async () => {
  const payload = await getCachedHomeRailArrivals()
  const boardState = await readHomeArrivalsBoardState(payload, "rail")

  return (
    <BrowserWindow previewLimit fullExampleHref={DOCS_FULL_EXAMPLE_HREF}>
      <RailArrivalsBoard
        data={payload.arrivals}
        lines={HOME_RAIL_LINES}
        stopName={payload.stopName}
        headingLevel={2}
        error={boardState.error}
        emptyKind={boardState.emptyKind}
      />
    </BrowserWindow>
  )
}

export default function DocsIntroductionPage() {
  const entry = getDocsEntry("introduction")!
  const arrivalsEntry = getDocsEntry("tube-rail-arrivals")!

  return (
    <DocsReadableWidth>
      <Suspense fallback={null}>
        <DocsVisitFromLanding />
      </Suspense>
      <article className="space-y-12">
        <DocsPageHeader
          entry={entry}
          title="React component documentation"
          description="Build TfL interfaces using installable React components and normalised tfl-ts data."
        />

        <p className="max-w-prose">
          <StartAction href="/docs/components">View all components</StartAction>
        </p>

        <section className="space-y-4" aria-labelledby="try-it">
          <h2 id="try-it" className="sr-only">
            Try a display
          </h2>
          <Suspense fallback={<IntroArrivalsFallback />}>
            <IntroArrivalsPreview />
          </Suspense>
        </section>

        <section className="space-y-3">
          <h2 id="get-a-key" className="text-lg font-semibold">
            1. Get a free TfL key from the{" "}
            <ExternalTextLink href={TFL_API_PORTAL_PRODUCT_URL}>
              TfL API portal
            </ExternalTextLink>
          </h2>
          <TflApiKeyHelpLink />
          <SyntaxHighlightedCode
            code={TFL_KEY_SNIPPET}
            language="bash"
            wrapperClassName="mt-0 mb-0"
          />
          <p className="max-w-prose text-muted-foreground">
            Optional. Paste a key here if you want{" "}
            <Link
              href="/docs/explorer"
              className="text-foreground underline underline-offset-4"
            >
              Explorer
            </Link>{" "}
            or live examples in these docs. Your browser calls TfL with it. It
            stays in this browser and is never sent to our server.
          </p>
          <TflApiKeyField
            id="docs-tfl-key"
            className="max-w-md"
            showHelp={false}
          />
        </section>

        <section className="space-y-3">
          <h2 id="optional-type" className="text-lg font-semibold">
            2. Set up a typeface (optional)
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Components use your app&apos;s font by default. The official
            Johnston font requires a licence from{" "}
            <ExternalTextLink href={TFL_BRAND_LINKS.fontRequests}>
              TfL
            </ExternalTextLink>{" "}
            (see{" "}
            <Link
              href="/docs/tfl-licensing"
              className="text-foreground underline underline-offset-4"
            >
              Licensing and brand use
            </Link>
            ). This site uses the free TfL-inspired{" "}
            <Link
              href="/docs/typography"
              className="text-foreground underline underline-offset-4"
            >
              Hammersmith One
            </Link>
            . If you have an Adobe subscription, P22 Underground is a closer
            match. See{" "}
            <Link
              href="/docs/typography"
              className="text-foreground underline underline-offset-4"
            >
              Typography
            </Link>{" "}
            for details.
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
                (Quick and easy) Calls TfL from the browser, AKA client side.
                Anyone can right click dev tools and see your TfL key.
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
                to call TfL from the server. This is more secure as the key
                stays on the server. To fully prevent abuse, consider
                implementing IP whitelisting or API key authentication.
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
                This method exposes an API endpoint (
                <code className="text-xs">/api/arrivals</code>) anyone can call.
                The example adds CORS. To fully prevent abuse, consider IP
                whitelisting or API key authentication.
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
        </section>
      </article>
    </DocsReadableWidth>
  )
}
