import type { Metadata } from "next";
import Link from "next/link";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { InstallCommand } from "@/components/docs/install-command";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Installation",
  description:
    "Add a TfL board with the shadcn CLI and configure your API keys.",
};

export default async function DocsInstallationPage() {
  const entry = getDocsEntry("installation")!;
  const { default: MDXPage } = await import("@/content/installation.mdx");

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry} />

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Quick install</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            One primary path — Status board. Browse the rest on the{" "}
            <Link
              href="/docs/components"
              className="text-foreground underline underline-offset-4"
            >
              Components catalogue
            </Link>
            .
          </p>
          <InstallCommand registryUrl="https://tfl-components.vercel.app/r/tube-status-board.json" />
        </section>

        <section className="border-t border-border pt-8">
          <MDXPage />
        </section>
      </article>
    </DocsReadableWidth>
  );
}
