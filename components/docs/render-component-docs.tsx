import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ComponentType } from "react";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { InstallCommand } from "@/components/docs/install-command";
import { CompactInstallButton } from "@/components/docs/compact-install-button";
import { RelationshipBadges } from "@/components/docs/relationship-badges";
import {
  getContentAssetSlug,
  getDocsEntry,
  getUsedBySlugs,
  type DocsEntry,
} from "@/lib/docs-catalog";
import { loadComponentDemo } from "@/lib/load-component-demo";
import { SyntaxHighlightedCode } from "@/components/docs/syntax-highlighted-code";
import { TubeStatusBoardSkeleton } from "@/components/tfl/status/tube-status-board";
import { RailArrivalsBoardSkeleton } from "@/components/tfl/arrivals/rail-arrivals-board";
import { BusArrivalsBoardSkeleton } from "@/components/tfl/arrivals/bus-arrivals-board";
import { CycleHireDocksBoardSkeleton } from "@/components/tfl/cycle-hire/cycle-hire-docks";
import { HOME_BUS_STOP, HOME_RAIL_STOP } from "@/lib/tfl/home-arrivals-stops";

type RelatedLink = { href: string; label: string };

type RenderComponentDocsOptions = {
  /** Catalog slug (also MDX / demo filename). */
  slug: string;
  /** Extra related links under the MDX body. */
  relatedLinks?: readonly RelatedLink[];
  /** Compact get-data → render example for data-aware pages. */
  getDataExample?: string;
};

const PREVIEW_SNIPPETS: Record<string, string> = {
  "tube-status-board": `const data = sortLinesBySeverityAndOrder(
  await tfl.line.getStatus({ modes: ["tube", "elizabeth-line"] }),
)

<TubeStatusBoard data={data} />`,
  "arrivals-board": `const data = await tfl.stopPoint.getArrivals({
  stopPointIds: ["940GZZLUOXC"],
  sortBy: "timeToStation",
})

<RailArrivalsBoard data={data} stopName="Oxford Circus" />`,
  "rail-arrivals-board": `const data = await tfl.stopPoint.getArrivals({
  stopPointIds: ["940GZZLUOXC"],
  sortBy: "timeToStation",
})

<RailArrivalsBoard data={data} stopName="Oxford Circus" />`,
  "cycle-hire-docks": `const data = await Promise.all([
  tfl.bikePoint.getById("BikePoints_237"),
  tfl.bikePoint.getById("BikePoints_490"),
  tfl.bikePoint.getById("BikePoints_46"),
])

<CycleHireDocksBoard data={data} />`,
  "line-strip": `const spine = await getLineSpine("victoria")

<LineStrip lineId="victoria" spine={spine} fit />`,
  "map-geographic": `import { TflGeographicMap } from "@/components/tfl/geography/tfl-geographic-map"

<div className="h-100">
  <TflGeographicMap />
</div>`,
};

const RailDocsPreviewFallback = () => (
  <RailArrivalsBoardSkeleton stopName={HOME_RAIL_STOP.name} />
);

const BusDocsPreviewFallback = () => (
  <BusArrivalsBoardSkeleton
    stopName={HOME_BUS_STOP.name}
    stopLetter={HOME_BUS_STOP.stopLetter}
  />
);

const PREVIEW_FALLBACKS: Record<string, ComponentType> = {
  "tube-status-board": TubeStatusBoardSkeleton,
  "rail-arrivals-board": RailDocsPreviewFallback,
  "bus-arrivals-board": BusDocsPreviewFallback,
  "cycle-hire-docks": CycleHireDocksBoardSkeleton,
};

const DocsPreviewFallback = ({ slug }: { slug: string }) => {
  const Fallback = PREVIEW_FALLBACKS[slug];
  if (!Fallback) return null;
  return <Fallback />;
};

const DocsDemoSlot = async ({ slug }: { slug: string }) => {
  const Demo = await loadComponentDemo(slug);
  if (!Demo) return null;
  return <Demo />;
};

const DocsMdxSlot = async ({ slug }: { slug: string }) => {
  let MDXPage: React.ComponentType<{ className?: string }> | null = null;
  try {
    const mod = await import(`@/content/components/${slug}.mdx`);
    MDXPage = mod.default;
  } catch {
    if (slug === "bus-arrivals-board") {
      try {
        const mod = await import(
          `@/content/components/rail-arrivals-board.mdx`
        );
        MDXPage = mod.default;
      } catch {
        MDXPage = null;
      }
    }
  }

  if (!MDXPage) return null;

  return <MDXPage />;
};

export const componentDocsMetadata = async (
  slug: string,
): Promise<Metadata> => {
  const entry = getDocsEntry(slug);
  if (!entry || entry.kind !== "component") {
    return { title: "Not found" };
  }
  return {
    title: entry.title,
    description: entry.description,
  };
};

export const renderComponentDocs = ({
  slug,
  relatedLinks = [],
  getDataExample,
}: RenderComponentDocsOptions) => {
  const entry = getDocsEntry(slug);
  if (!entry || entry.kind !== "component") notFound();

  const contentSlug = getContentAssetSlug(slug);
  const snippet =
    getDataExample ??
    PREVIEW_SNIPPETS[contentSlug] ??
    PREVIEW_SNIPPETS[slug];
  const usedBy = getUsedBySlugs(entry.slug);

  return (
    <DocsReadableWidth>
      <article className="space-y-14">
        <DocsPageHeader entry={entry as DocsEntry} />
        <RelationshipBadges
          builtWith={entry.builtWith}
          usesFoundations={entry.usesFoundations}
          usedBy={usedBy}
        />

        <section className="space-y-6" aria-labelledby="preview-heading">
          <div className="space-y-3">
            <h2 id="preview-heading" className="text-lg font-semibold">
              Preview
            </h2>
            <Suspense fallback={<DocsPreviewFallback slug={contentSlug} />}>
              <DocsDemoSlot slug={contentSlug} />
            </Suspense>
          </div>

          {snippet ? (
            <div className="space-y-2">
              <h2 id="usage-heading" className="text-lg font-semibold">
                Usage
              </h2>
              <SyntaxHighlightedCode
                code={snippet}
                language="tsx"
                peekLines={3}
              />
            </div>
          ) : null}

          {entry.registryUrl ? (
            <CompactInstallButton registryUrl={entry.registryUrl} />
          ) : null}
        </section>

        {entry.registryUrl ? (
          <section className="space-y-2" aria-labelledby="install-heading">
            <h2 id="install-heading" className="text-lg font-semibold">
              Installation
            </h2>
            <InstallCommand registryUrl={entry.registryUrl} />
          </section>
        ) : null}

        <Suspense fallback={null}>
          <DocsMdxSlot slug={contentSlug} />
        </Suspense>

        {relatedLinks.length > 0 ? (
          <section className="max-w-prose space-y-2 border-t border-border pt-8">
            <h2 id="in-code" className="text-lg font-semibold">
              In code
            </h2>
            <p className="text-sm text-muted-foreground">
              {relatedLinks.map((link, index) => (
                <span key={link.href}>
                  {index > 0 ? " · " : null}
                  <a
                    href={link.href}
                    className="text-foreground underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </a>
                </span>
              ))}
            </p>
          </section>
        ) : null}
      </article>
    </DocsReadableWidth>
  );
};
