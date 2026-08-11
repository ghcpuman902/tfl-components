import type { Metadata } from "next";
import Link from "next/link";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { InstallCommand } from "@/components/docs/install-command";
import { getDocsEntry } from "@/lib/docs-catalog";
import { REGISTRY_BASE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Installation",
  description:
    "Copy a board into your app with the shadcn CLI — what lands on disk, what still needs keys.",
};

export default async function DocsInstallationPage() {
  const entry = getDocsEntry("installation")!;
  const { default: MDXPage } = await import("@/content/installation.mdx");

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry} />

        <section className="space-y-4">
          <h2 id="quick-install" className="text-lg font-semibold">
            Quick install
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Status board first — one URL copies the board, brand helpers, and
            colour tokens into your repo. Expect a dozen-plus files, a{" "}
            <code className="text-xs">globals.css</code> update, and{" "}
            <code className="text-xs">tfl-ts</code> as a dependency. More items
            on the{" "}
            <Link
              href="/docs/components"
              className="text-foreground underline underline-offset-4"
            >
              Components catalogue
            </Link>
            .
          </p>
          <InstallCommand
            registryUrl={`${REGISTRY_BASE}/tube-status-board.json`}
          />
        </section>

        <section className="border-t border-border pt-8">
          <MDXPage />
        </section>
      </article>
    </DocsReadableWidth>
  );
}
