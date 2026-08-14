import type { Metadata } from "next";
import Link from "next/link";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { InstallCommand } from "@/components/docs/install-command";
import { getDocsEntry } from "@/lib/docs-catalog";
import { REGISTRY_BASE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Troubleshoot",
  description:
    "CLI details, files on disk, and what to check when a component install does not look right.",
};

export default async function DocsInstallationPage() {
  const entry = getDocsEntry("installation")!;
  const { default: MDXPage } = await import("@/content/installation.mdx");

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry} />

        <section className="space-y-4">
          <p className="max-w-prose text-muted-foreground">
            There is no all-in-one install. Start from the{" "}
            <Link
              href="/docs"
              className="text-foreground underline underline-offset-4"
            >
              Introduction
            </Link>{" "}
            and add the one board you need from{" "}
            <Link
              href="/docs/components"
              className="text-foreground underline underline-offset-4"
            >
              Components
            </Link>
            . This page is the CLI detail — files on disk, skipped atoms, and
            what still needs a key.
          </p>
          <h2 id="quick-install" className="text-lg font-semibold">
            Example: status board
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            One URL copies the board, brand helpers, and colour tokens into
            your repo. Expect a dozen-plus files, a{" "}
            <code className="text-xs">globals.css</code> update, and{" "}
            <code className="text-xs">tfl-ts</code> as a dependency.
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
