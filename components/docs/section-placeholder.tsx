import Link from "next/link";
import type { DocsEntry } from "@/lib/docs-catalog";
import { getEntriesByGroup } from "@/lib/docs-catalog";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { Badge } from "@/components/ui/badge";

type SectionPlaceholderProps = {
  entry: DocsEntry;
  purpose: string;
  futureSlots?: readonly string[];
  relatedHrefs?: readonly { href: string; label: string }[];
};

export const SectionPlaceholder = ({
  entry,
  purpose,
  futureSlots = [],
  relatedHrefs = [],
}: SectionPlaceholderProps) => {
  const siblings = getEntriesByGroup(entry.group).filter(
    (item) => item.slug !== entry.slug,
  );

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry} />

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Scaffold placeholder</Badge>
          <Badge variant="secondary">Not a finished feature</Badge>
        </div>

        <section className="space-y-2" aria-labelledby="purpose-heading">
          <h2 id="purpose-heading" className="text-lg font-semibold">
            Purpose
          </h2>
          <p className="max-w-prose text-muted-foreground">{purpose}</p>
        </section>

        {futureSlots.length > 0 ? (
          <section className="space-y-2" aria-labelledby="future-heading">
            <h2 id="future-heading" className="text-lg font-semibold">
              Planned slots
            </h2>
            <ul className="list-inside list-disc text-muted-foreground">
              {futureSlots.map((slot) => (
                <li key={slot}>{slot}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {siblings.length > 0 ? (
          <section className="space-y-2" aria-labelledby="in-group-heading">
            <h2 id="in-group-heading" className="text-lg font-semibold">
              Already in this group
            </h2>
            <ul className="space-y-1">
              {siblings.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={item.href}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {item.title}
                  </Link>
                  {item.kind === "placeholder" ? (
                    <span className="text-muted-foreground"> (placeholder)</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {relatedHrefs.length > 0 ? (
          <section className="space-y-2" aria-labelledby="related-heading">
            <h2 id="related-heading" className="text-lg font-semibold">
              Related
            </h2>
            <ul className="space-y-1">
              {relatedHrefs.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="text-sm text-muted-foreground">
          See{" "}
          <code className="text-xs">docs/TARGET_ARCHITECTURE.md</code> and{" "}
          <code className="text-xs">docs/page-anatomy.md</code> for frozen
          Stage 1 rules. Bulk migration of existing pages has not run yet.
        </p>
      </article>
    </DocsReadableWidth>
  );
};
