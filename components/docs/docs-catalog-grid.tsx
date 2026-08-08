import Link from "next/link";
import {
  DOCS_ENTRIES,
  getPopulatedGroups,
  type DocsGroupId,
} from "@/lib/docs-catalog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CATALOG_GROUPS: DocsGroupId[] = [
  "foundations",
  "tube-rail",
  "bus",
  "tools",
];

export const DocsCatalogGrid = () => {
  const groups = getPopulatedGroups().filter((group) =>
    CATALOG_GROUPS.includes(group.id),
  );

  return (
    <div className="space-y-8">
      {groups.map((group) => {
        const entries = DOCS_ENTRIES.filter(
          (entry) => entry.group === group.id,
        );
        return (
          <section key={group.id} className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {group.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {group.description}
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {entries.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={entry.href}
                    className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Card className="h-full transition-colors hover:bg-muted/40">
                      <CardHeader className="gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-base">
                            {entry.title}
                          </CardTitle>
                          {entry.registryUrl ? (
                            <Badge variant="secondary">Installable</Badge>
                          ) : null}
                        </div>
                        <CardDescription>{entry.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};
