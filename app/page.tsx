import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { HomeEditorial } from "@/components/docs/home-editorial";
import { HomeHeroPhotos } from "@/components/docs/home-hero-photos";
import { SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  title: "tfl-components",
  description: SITE_DESCRIPTION,
};

export default function HomePage() {
  return (
    <div className="@container/main w-full min-w-0 max-w-full overflow-x-clip">
      <HomeEditorial
        intro={
          <div className="grid grid-cols-1 gap-8 pt-0 pb-16 md:grid-cols-12 md:items-stretch md:gap-10 md:py-20">
            <figure className="relative aspect-[3/2] min-w-0 overflow-hidden md:col-span-6 md:aspect-auto md:h-[min(66.6667svh,40rem)] lg:col-span-5">
              <HomeHeroPhotos />
            </figure>

            <div className="flex min-w-0 flex-col gap-8 md:col-span-6 md:h-[min(66.6667svh,40rem)] md:justify-between md:gap-10 lg:col-span-7">
              <h1 className="tfl-title text-5xl text-foreground md:text-6xl lg:text-7xl">
                tfl-components
              </h1>
              <div className="space-y-6 md:space-y-8">
                <p className="max-w-xl text-lg text-foreground md:text-xl">
                  Web components for your TfL projects. Built for{" "}
                  <Link
                    href="/docs/station-name-labels#width"
                    className="underline underline-offset-4"
                  >
                    every screen size
                  </Link>
                  , with{" "}
                  <Link
                    href="/docs/station-name-labels#accessibility"
                    className="underline underline-offset-4"
                  >
                    full accessibility
                  </Link>
                  . Use with{" "}
                  <a
                    href="https://www.npmjs.com/package/tfl-ts"
                    className="underline underline-offset-4"
                    target="_blank"
                    rel="noreferrer"
                  >
                    tfl-ts
                  </a>{" "}
                  for a live dashboard, or drop them in alone for the look.
                </p>
                <Link
                  href="/docs/components"
                  className="inline-flex w-fit items-center gap-1.5 text-lg text-foreground underline underline-offset-4 md:text-xl"
                >
                  Start browsing
                  <ArrowRightIcon
                    className="size-[2ex] shrink-0"
                    strokeWidth={3}
                    absoluteStrokeWidth
                    aria-hidden
                  />
                </Link>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
