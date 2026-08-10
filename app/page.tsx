import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { HomeEditorial } from "@/components/docs/home-editorial";

export const metadata: Metadata = {
  title: "tfl-components",
  description:
    "React components for everyday TfL data displays. Responsive, accessible. Use with tfl-ts for live dashboards, or on their own for the look.",
};

export default function HomePage() {
  return (
    <div className="@container/main w-full min-w-0 max-w-full overflow-x-clip">
      <HomeEditorial
        intro={
          <div className="grid min-h-[66.6667svh] grid-cols-1 items-center gap-8 py-16 md:grid-cols-12 md:gap-10 md:py-20">
            <div className="flex min-w-0 flex-col justify-center gap-8 md:col-span-6 md:gap-10 lg:col-span-7">
              <div className="space-y-5 md:space-y-6">
                <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                  tfl-components
                </h1>
                <p className="max-w-xl text-lg text-muted-foreground md:text-xl">
                  Web components for your TfL projects. Built for{" "}
                  <Link
                    href="/foundations/station-labels#width"
                    className="text-foreground underline-offset-4 hover:underline"
                  >
                    every screen size
                  </Link>
                  , with{" "}
                  <Link
                    href="/foundations/station-labels#accessibility"
                    className="text-foreground underline-offset-4 hover:underline"
                  >
                    full accessibility
                  </Link>
                  . Use with{" "}
                  <a
                    href="https://www.npmjs.com/package/tfl-ts"
                    className="text-foreground underline-offset-4 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    tfl-ts
                  </a>{" "}
                  for a live dashboard, or drop them in alone for the look.
                </p>
              </div>
              <Link
                href="/interfaces"
                className="inline-flex w-fit items-center gap-1.5 text-base font-medium text-foreground underline-offset-4 hover:underline md:text-lg"
              >
                Start browsing
                <ArrowRightIcon className="size-4" aria-hidden />
              </Link>
            </div>

            <figure className="min-w-0 md:col-span-6 lg:col-span-5">
              {/* Native img keeps the Display P3 ICC; next/image can strip wide-gamut profiles. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/home/wapping-station.jpg"
                alt="Rotherhithe station platform, viewed from inside the station"
                width={1400}
                height={2111}
                className="h-auto w-full"
                decoding="async"
                fetchPriority="high"
              />
              <figcaption className="mt-3 text-center text-[0.65rem] leading-relaxed text-balance text-muted-foreground/60">
                Rotherhithe station. Photo © MangleKuo. TfL premises and marks ©
                Transport for London.
              </figcaption>
            </figure>
          </div>
        }
      />
    </div>
  );
}
