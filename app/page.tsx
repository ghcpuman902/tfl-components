import type { Metadata } from "next";
import { Suspense } from "react";
import { DocsCatalogGrid } from "@/components/docs/docs-catalog-grid";
import { WeekAheadSection } from "@/components/tfl/week-ahead/week-ahead-section";
import { WeekAheadSkeleton } from "@/components/tfl/week-ahead/week-ahead-skeleton";

export const metadata: Metadata = {
  title: "tfl-components — This week ahead",
  description:
    "This week’s Tube, Elizabeth line, DLR, Overground, and Tram service on horizontal diagrams, plus open React components for London transport boards.",
};

async function IntroContent() {
  const { default: IntroMDX } = await import("@/content/introduction.mdx");
  return <IntroMDX />;
}

export default function HomePage() {
  return (
    <div className="@container/main w-full min-w-0 max-w-full space-y-12">
      <div className="w-full min-w-0 max-w-full overflow-x-clip">
        <Suspense fallback={<WeekAheadSkeleton />}>
          <WeekAheadSection />
        </Suspense>
      </div>

      <div className="mx-auto w-full max-w-5xl space-y-12">
        <section className="border-t border-border pt-8">
          <Suspense fallback={null}>
            <IntroContent />
          </Suspense>
        </section>

        <section className="space-y-4 border-t border-border pt-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Catalog</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Organised by developer intent (frozen Stage 1 IA): Explore,
              Interfaces, Primitives, Foundations, Maps, Tools, and Drafts.
            </p>
          </div>
          <DocsCatalogGrid />
        </section>
      </div>
    </div>
  );
}
