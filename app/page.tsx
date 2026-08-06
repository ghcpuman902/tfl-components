import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { TubeStatusBoard } from "@/components/tfl/tube-status-board";

export const metadata: Metadata = {
  title: "tfl-components — Live TfL Status",
  description:
    "Live London tube and rail status boards you can copy into Next.js via the shadcn registry.",
};

const OTHER_BOARDS = [
  { href: "/arrivals", label: "Bus arrivals" },
  { href: "/batch-status", label: "Batch status" },
  { href: "/explore", label: "Explore" },
  { href: "/route", label: "Route" },
  { href: "/arrivals/live", label: "Live arrivals" },
  { href: "/line-badge", label: "Line badge" },
  { href: "/roundel", label: "Roundel" },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-svh">
      <SiteHeader pathname="/" />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <TubeStatusBoard />

        <aside className="mt-10 space-y-4 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          <div>
            <p className="mb-2 font-medium text-foreground">Install into your app</p>
            <pre className="overflow-x-auto rounded bg-muted p-3 text-xs text-foreground">
              {`pnpm dlx shadcn@latest add https://tfl-components.vercel.app/r/tube-status-board.json`}
            </pre>
            <p className="mt-2">
              Copies the component source and installs{" "}
              <code className="text-xs">tfl-ts</code>. Put{" "}
              <code className="text-xs">TFL_APP_ID</code> /{" "}
              <code className="text-xs">TFL_APP_KEY</code> in your server env.
            </p>
          </div>

          <div>
            <p className="mb-2 font-medium text-foreground">More boards</p>
            <ul className="flex flex-wrap gap-2">
              {OTHER_BOARDS.map((board) => (
                <li key={board.href}>
                  <Link
                    href={board.href}
                    className="inline-flex rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground hover:bg-muted"
                  >
                    {board.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <p>
            Press <kbd className="rounded border px-1">d</kbd> to toggle dark
            mode.
          </p>
        </aside>
      </main>
    </div>
  );
}
