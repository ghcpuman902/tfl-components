import type { Metadata } from "next";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { InstallCommand } from "@/components/docs/install-command";
import { getDocsEntry, getInstallableEntries } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Installation",
  description:
    "Add a TfL board with the shadcn CLI and configure your API keys.",
};

export default async function InstallationPage() {
  const entry = getDocsEntry("installation")!;
  const installable = getInstallableEntries();
  const { default: MDXPage } = await import("@/content/installation.mdx");

  return (
    <article className="space-y-8">
      <DocsPageHeader entry={entry} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Quick install</h2>
        <InstallCommand registryUrl="https://tfl-components.vercel.app/r/tube-status-board.json" />
        <ul className="grid gap-3 sm:grid-cols-2">
          {installable.map((item) =>
            item.registryUrl ? (
              <li
                key={item.slug}
                className="rounded-lg border border-border bg-card p-3"
              >
                <p className="mb-2 text-sm font-medium">{item.title}</p>
                <InstallCommand registryUrl={item.registryUrl} />
              </li>
            ) : null,
          )}
        </ul>
      </section>

      <section className="border-t border-border pt-8">
        <MDXPage />
      </section>
    </article>
  );
}
