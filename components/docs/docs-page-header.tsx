import Link from "next/link";
import type { DocsEntry } from "@/lib/docs-catalog";
import { DOCS_GROUPS, layerBadgeLabel } from "@/lib/docs-catalog";
import { Badge } from "@/components/ui/badge";
import { InstallCommand } from "@/components/docs/install-command";

type DocsPageHeaderProps = {
  entry: DocsEntry;
};

export const DocsPageHeader = ({ entry }: DocsPageHeaderProps) => {
  const group = DOCS_GROUPS.find((item) => item.id === entry.group);

  return (
    <header className="mb-8 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {group ? (
          <Badge variant="outline">{group.title}</Badge>
        ) : null}
        {entry.layer ? (
          <Badge variant="outline">{layerBadgeLabel(entry.layer)}</Badge>
        ) : null}
        {entry.registryUrl ? (
          <Badge variant="secondary">Installable</Badge>
        ) : entry.kind === "tool" ? (
          <Badge variant="outline">Tool</Badge>
        ) : entry.kind === "placeholder" ? (
          <Badge variant="outline">Placeholder</Badge>
        ) : entry.kind === "draft" ? (
          <Badge variant="outline">Draft</Badge>
        ) : null}
      </div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {entry.title}
        </h1>
        <p className="mt-2 max-w-prose text-muted-foreground">
          {entry.description}
        </p>
      </div>
      {entry.registryUrl ? (
        <div className="pt-2">
          <InstallCommand registryUrl={entry.registryUrl} />
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">
        <Link href="/" className="underline-offset-4 hover:underline">
          Home
        </Link>
        {group ? (
          <>
            {" · "}
            <span>{group.title}</span>
          </>
        ) : null}
      </p>
    </header>
  );
};
