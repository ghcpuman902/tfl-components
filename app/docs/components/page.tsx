import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { Badge } from "@/components/ui/badge";
import {
  entryBadgeLabel,
  getCatalogueEntries,
  getDocsEntry,
} from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Components",
  description:
    "Preferred boards first, then the parts they are built from.",
};

const CATALOG_PREVIEWS: Partial<Record<string, string>> = {
  "tube-rail-arrivals": "/images/catalog/tube-rail-arrivals.png",
  "tube-rail-status": "/images/catalog/tube-rail-status.png",
  "bus-arrivals": "/images/catalog/bus-arrivals.png",
  "cycle-hire-docks": "/images/catalog/cycle-hire-docks.png",
  "maps-geographic": "/images/catalog/maps-geographic.png",
};

export default function DocsComponentsCataloguePage() {
  const entry = getDocsEntry("components-index")!;
  const items = getCatalogueEntries();

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry} />

        <section aria-label="Component catalogue">
          <ul className="divide-y divide-border border-y border-border">
            {items.map((item) => {
              const preview = CATALOG_PREVIEWS[item.slug];
              const badge = entryBadgeLabel(item);
              return (
                <li key={item.slug}>
                  <Link
                    href={item.href}
                    className="flex flex-col gap-3 py-4 hover:bg-muted/40 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">
                          {item.title}
                        </span>
                        {badge ? (
                          <Badge variant="outline">{badge}</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    {preview ? (
                      <Image
                        src={preview}
                        alt=""
                        width={384}
                        height={216}
                        sizes="192px"
                        unoptimized={item.slug === "tube-rail-arrivals"}
                        className="aspect-video w-full max-w-48 shrink-0 rounded-md border border-border object-cover object-top sm:w-48"
                      />
                    ) : (
                      <div
                        className="aspect-video w-full max-w-48 shrink-0 rounded-md border border-dashed border-border bg-muted/40 sm:w-48"
                        aria-hidden
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
