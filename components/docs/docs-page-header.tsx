import Link from "next/link";
import type { DocsEntry } from "@/lib/docs-catalog";
import {
  DOCS_GROUPS,
  entryBadgeLabel,
  getAdjacentEntries,
} from "@/lib/docs-catalog";
import { Badge } from "@/components/ui/badge";
import { DocsPageActions } from "@/components/docs/docs-page-actions";

type DocsPageHeaderProps = {
  entry: DocsEntry;
  /**
   * @deprecated Snippets belong in the Preview block, not the hero.
   * Kept optional so call sites compile during migration; ignored.
   */
  getDataSnippet?: React.ReactNode;
  /**
   * @deprecated Install belongs below Preview; ignored.
   */
  preferPreview?: boolean;
};

/**
 * Shared docs hero: breadcrumb + actions, title + one-line intro, single layer badge.
 * Relationship badges, install, and get-data snippets live in body sections — not here.
 */
export const DocsPageHeader = ({ entry }: DocsPageHeaderProps) => {
  const group = DOCS_GROUPS.find((item) => item.id === entry.group);
  const badge = entryBadgeLabel(entry);
  const { prev, next } = getAdjacentEntries(entry.slug);

  return (
    <header className="mb-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="underline-offset-4 hover:underline">
            Home
          </Link>
          {group ? (
            <>
              <span aria-hidden> / </span>
              <span>{group.title}</span>
            </>
          ) : null}
        </p>
        <DocsPageActions prev={prev} next={next} />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {entry.title}
          </h1>
          <p className="mt-2 max-w-prose text-muted-foreground">
            {entry.description}
          </p>
        </div>
        {badge ? (
          <Badge variant="outline" className="mt-1 shrink-0">
            {badge}
          </Badge>
        ) : null}
      </div>
    </header>
  );
};
