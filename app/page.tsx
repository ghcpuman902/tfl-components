import type { Metadata } from "next";
import {
  DEFAULT_STATUS_LINE_IDS,
  TubeStatusBoard,
} from "@/components/tfl/status/tube-status-board";
import { DocsCatalogGrid } from "@/components/docs/docs-catalog-grid";
import { InstallCommand } from "@/components/docs/install-command";

export const metadata: Metadata = {
  title: "tfl-components — Live TfL Status",
  description:
    "Live London tube and rail status boards you can copy into Next.js via the shadcn registry.",
};

const REGISTRY_URL =
  "https://tfl-components.vercel.app/r/tube-status-board.json";

export default async function HomePage() {
  const { default: IntroMDX } = await import("@/content/introduction.mdx");

  return (
    <div className="space-y-12">
      <TubeStatusBoard lineIds={DEFAULT_STATUS_LINE_IDS} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Install this board
        </h2>
        <p className="text-sm text-muted-foreground">
          Copies the component source and installs{" "}
          <code className="rounded bg-muted px-1 text-xs">tfl-ts</code>. Put{" "}
          <code className="rounded bg-muted px-1 text-xs">TFL_APP_ID</code> /{" "}
          <code className="rounded bg-muted px-1 text-xs">TFL_APP_KEY</code> in
          your server env.
        </p>
        <InstallCommand registryUrl={REGISTRY_URL} />
      </section>

      <section className="border-t border-border pt-8">
        <IntroMDX />
      </section>

      <section className="space-y-4 border-t border-border pt-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Components</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Grouped the way Londoners think about transport — not by API mode
            IDs.
          </p>
        </div>
        <DocsCatalogGrid />
      </section>
    </div>
  );
}
