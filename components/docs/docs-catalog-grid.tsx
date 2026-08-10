import Link from "next/link";
import {
  getCatalogueEntries,
  layerBadgeLabel,
} from "@/lib/docs-catalog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Simple catalogue cards — prefer `/docs/components` for the primary list. */
export const DocsCatalogGrid = () => {
  const entries = getCatalogueEntries();

  return (
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
                  <CardTitle className="text-base">{entry.title}</CardTitle>
                  {entry.comingSoon ? (
                    <Badge variant="outline">Coming soon</Badge>
                  ) : null}
                  {entry.layer ? (
                    <Badge variant="outline">
                      {layerBadgeLabel(entry.layer)}
                    </Badge>
                  ) : null}
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
  );
};
