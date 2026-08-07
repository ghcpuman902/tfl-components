import type { Metadata } from "next";
import Link from "next/link";
import {
  DEFAULT_STATUS_LINE_IDS,
  TubeStatusBoard,
} from "@/components/tfl/tube-status-board";
import { CodeCollapsible } from "@/components/docs/code-collapsible";
import { InstallCommand } from "@/components/docs/install-command";

export const metadata: Metadata = {
  title: "tfl-components — Live TfL Status",
  description:
    "Live London tube and rail status boards you can copy into Next.js via the shadcn registry.",
};

const REGISTRY_URL =
  "https://tfl-components.vercel.app/r/tube-status-board.json";

const USAGE_CODE = `import { TubeStatusBoard } from "@/components/tfl/tube-status-board"

export default function Page() {
  return <TubeStatusBoard />
}`;

const BATCH_CODE = `import {
  DEFAULT_STATUS_LINE_IDS,
  TubeStatusBoard,
} from "@/components/tfl/tube-status-board"

// One request for a fixed set of line IDs — the usual app default.
export default function Page() {
  return <TubeStatusBoard lineIds={DEFAULT_STATUS_LINE_IDS} />
}

// Or pass your own:
// <TubeStatusBoard lineIds={["central", "victoria", "elizabeth"]} />`;

const CUSTOM_LINES_CODE = `const MY_LINES = [
  "bakerloo",
  "central",
  "circle",
  "district",
  "hammersmith-city",
  "jubilee",
  "metropolitan",
  "northern",
  "piccadilly",
  "victoria",
  "waterloo-city",
] as const

export default function Page() {
  return <TubeStatusBoard lineIds={MY_LINES} />
}`;

const OTHER_BOARDS = [
  { href: "/arrivals", label: "Bus arrivals" },
  { href: "/explore", label: "Explore" },
  { href: "/route", label: "Route" },
  { href: "/arrivals/live", label: "Live arrivals" },
  { href: "/line-badge", label: "Line badge" },
  { href: "/roundel", label: "Roundel" },
  { href: "/line-diagram", label: "Line diagram" },
] as const;

export default function HomePage() {
  return (
    <>
      <TubeStatusBoard lineIds={DEFAULT_STATUS_LINE_IDS} />

      <section className="mt-10 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Installation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Copies the component source and installs{" "}
            <code className="rounded bg-muted px-1 text-xs">tfl-ts</code>. Put{" "}
            <code className="rounded bg-muted px-1 text-xs">TFL_APP_ID</code> /{" "}
            <code className="rounded bg-muted px-1 text-xs">TFL_APP_KEY</code> in
            your server env.
          </p>
        </div>

        <InstallCommand registryUrl={REGISTRY_URL} />

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Usage</h2>
          <CodeCollapsible
            title="Basic"
            description="Omit lineIds to load all tube / Elizabeth / DLR / tram / Overground modes."
            code={USAGE_CODE}
            defaultOpen
          />
          <CodeCollapsible
            title="Batch by line IDs"
            description={`Default demo set: ${DEFAULT_STATUS_LINE_IDS.join(", ")}. One request for the lines you care about.`}
            code={BATCH_CODE}
            defaultOpen
          />
          <CodeCollapsible
            title="Custom Underground set"
            description="Pass any TfL line IDs — still a single getStatus call."
            code={CUSTOM_LINES_CODE}
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">More boards</p>
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

        <p className="text-sm text-muted-foreground">
          Press <kbd className="rounded border px-1">d</kbd> to toggle dark mode.
        </p>
      </section>
    </>
  );
}
