import Link from "next/link";
import type { DocsEntry } from "@/lib/docs-catalog";
import { getEntriesByGroup } from "@/lib/docs-catalog";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";

type SectionHubProps = {
  entry: DocsEntry;
  purpose: string;
  /** Unfinished second-level ideas — shown as Coming soon. */
  comingSoon?: readonly string[];
  relatedHrefs?: readonly { href: string; label: string }[];
  /** Optional notice above the header (e.g. Explorer WIP). */
  banner?: React.ReactNode;
};

export const SectionHub = ({
  entry,
  purpose,
  comingSoon = [],
  relatedHrefs = [],
  banner,
}: SectionHubProps) => {
  const siblings = getEntriesByGroup(entry.group).filter(
    (item) => item.slug !== entry.slug,
  );

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        {banner}

        <DocsPageHeader entry={entry} />

        <section className="space-y-2" aria-labelledby="purpose-heading">
          <h2 id="purpose-heading" className="text-lg font-semibold">
            Purpose
          </h2>
          <p className="max-w-prose text-muted-foreground">{purpose}</p>
        </section>

        {siblings.length > 0 ? (
          <section className="space-y-2" aria-labelledby="in-section-heading">
            <h2 id="in-section-heading" className="text-lg font-semibold">
              In this section
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
                  <span className="text-muted-foreground">
                    {" "}
                    — {item.description}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {comingSoon.length > 0 ? (
          <section className="space-y-2" aria-labelledby="coming-soon-heading">
            <h2 id="coming-soon-heading" className="text-lg font-semibold">
              Coming soon
            </h2>
            <ul className="list-inside list-disc text-muted-foreground">
              {comingSoon.map((slot) => (
                <li key={slot}>{slot}</li>
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
      </article>
    </DocsReadableWidth>
  );
};
