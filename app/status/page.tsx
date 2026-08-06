import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { TubeStatusBoard } from "@/components/tfl/tube-status-board";

export const metadata: Metadata = {
  title: "Line status — tfl-components",
  description: "Live London tube and rail status with official line colours.",
};

export default function StatusPage() {
  return (
    <div className="min-h-svh">
      <SiteHeader pathname="/status" />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <TubeStatusBoard />
        <aside className="mt-10 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Install into your app</p>
          <pre className="overflow-x-auto rounded bg-muted p-3 text-xs text-foreground">
            {`pnpm dlx shadcn@latest add https://tfl-components.vercel.app/r/tube-status-board.json`}
          </pre>
          <p className="mt-2">
            Requires <code className="text-xs">tfl-ts</code> and{" "}
            <code className="text-xs">TFL_APP_ID</code> /{" "}
            <code className="text-xs">TFL_APP_KEY</code> in your server env.
            Status data uses Cache Components (~60s revalidate).
          </p>
        </aside>
      </main>
    </div>
  );
}
