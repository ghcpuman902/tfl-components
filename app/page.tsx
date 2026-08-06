import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "tfl-components — TfL React UI",
  description:
    "Open React components for London transport boards, powered by tfl-ts. Install via shadcn registry.",
};

const BOARDS = [
  {
    href: "/status",
    title: "Tube / rail status",
    description:
      "Severity-sorted disruptions and good-service grid with official line colours.",
  },
  {
    href: "/arrivals",
    title: "Bus arrivals",
    description:
      "Nearby stops via geolocation or search, route-number chips, live countdowns.",
  },
  {
    href: "/batch-status",
    title: "Batch status",
    description: "Status for a curated set of line IDs in one request.",
  },
  {
    href: "/explore",
    title: "Explore by mode",
    description: "Browse routes grouped by transport mode.",
  },
  {
    href: "/route",
    title: "Route detail",
    description: "Stops and sequence for a single line.",
  },
  {
    href: "/arrivals/live",
    title: "Live tube arrivals",
    description: "Polling board for a tube station using tfl-ts realtime helpers.",
  },
  {
    href: "/line-badge",
    title: "Line badge",
    description: "Primitive chip with official colours and dark-mode outlines.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-svh">
      <SiteHeader pathname="/" />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <section className="space-y-3">
          <h1 className="text-balance text-4xl font-extrabold tracking-tight">
            London transport UI components
          </h1>
          <p className="max-w-2xl text-pretty text-muted-foreground">
            Live boards built on{" "}
            <a
              href="https://www.npmjs.com/package/tfl-ts"
              className="text-blue-500 hover:underline"
            >
              tfl-ts
            </a>
            . Copy them into your app with the shadcn registry — you own the
            source, and they read{" "}
            <code className="rounded bg-muted px-1 text-xs">TFL_APP_ID</code> /{" "}
            <code className="rounded bg-muted px-1 text-xs">TFL_APP_KEY</code>{" "}
            from your environment.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/status"
              className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Open status board
            </Link>
            <a
              href="https://github.com/ghcpuman902/tfl-ts"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
            >
              tfl-ts on GitHub
            </a>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {BOARDS.map((board) => (
            <Link key={board.href} href={board.href} className="group">
              <Card className="h-full transition-colors group-hover:bg-muted/40">
                <CardHeader>
                  <CardTitle className="text-lg">{board.title}</CardTitle>
                  <CardDescription>{board.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-blue-500">
                  View demo →
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>

        <section className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <h2 className="mb-2 font-semibold">Install (once the registry is live)</h2>
          <pre className="overflow-x-auto rounded bg-background p-3 text-xs">
            {`pnpm dlx shadcn@latest add https://tfl.manglekuo.com/r/tube-status-board.json`}
          </pre>
          <p className="mt-2 text-muted-foreground">
            Press <kbd className="rounded border px-1">d</kbd> to toggle dark
            mode.
          </p>
        </section>
      </main>
    </div>
  );
}
