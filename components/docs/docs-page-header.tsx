import Link from "next/link";
import type { DocsEntry } from "@/lib/docs-catalog";
import { DOCS_GROUPS, getUsedBySlugs, layerBadgeLabel } from "@/lib/docs-catalog";
import { Badge } from "@/components/ui/badge";
import { InstallCommand } from "@/components/docs/install-command";
import { RelationshipBadges } from "@/components/docs/relationship-badges";

type DocsPageHeaderProps = {
  entry: DocsEntry;
  /** Compact get-data → render snippet shown under badges for data-aware pages. */
  getDataSnippet?: React.ReactNode;
  /** Prefer preview before a large install block. */
  preferPreview?: boolean;
};

export const DocsPageHeader = ({
  entry,
  getDataSnippet,
  preferPreview = false,
}: DocsPageHeaderProps) => {
  const group = DOCS_GROUPS.find((item) => item.id === entry.group);
  const usedBy = getUsedBySlugs(entry.slug);
  const showInstallInline = Boolean(entry.registryUrl) && !preferPreview;

  return (
    <header className="mb-8 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {group ? <Badge variant="outline">{group.title}</Badge> : null}
        {entry.layer ? (
          <Badge variant="outline">{layerBadgeLabel(entry.layer)}</Badge>
        ) : null}
        {entry.registryUrl ? (
          <Badge variant="secondary">Installable</Badge>
        ) : entry.kind === "tool" ? (
          <Badge variant="outline">Tool</Badge>
        ) : entry.kind === "block" ? (
          <Badge variant="outline">Block</Badge>
        ) : entry.kind === "placeholder" ? (
          <Badge variant="outline">Placeholder</Badge>
        ) : entry.kind === "draft" ? (
          <Badge variant="outline">Draft</Badge>
        ) : null}
      </div>

      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {entry.title}
        </h1>
        <p className="mt-2 max-w-prose text-muted-foreground">
          {entry.description}
        </p>
      </div>

      <RelationshipBadges
        builtWith={entry.builtWith}
        usesFoundations={entry.usesFoundations}
        usedBy={
          entry.layer === "primitive" || entry.group === "foundations"
            ? usedBy
            : undefined
        }
      />

      {getDataSnippet ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Get data, then render
          </p>
          {getDataSnippet}
        </div>
      ) : null}

      {showInstallInline && entry.registryUrl ? (
        <div className="pt-1">
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
