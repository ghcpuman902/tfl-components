import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { HomeEditorial } from "@/components/docs/home-editorial"
import { HomeHeroPhotos } from "@/components/docs/home-hero-photos"
import { SITE_NAME } from "@/lib/site"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"

export const metadata: Metadata = pageMetadata({
  ...ROUTE_PAGE_META.home,
  absoluteTitle: true,
})

export default function HomePage() {
  return (
    <div className="@container/main w-full max-w-full min-w-0 overflow-x-clip">
      <HomeEditorial
        intro={
          <div className="grid grid-cols-1 gap-8 pt-0 pb-16 md:grid-cols-12 md:items-stretch md:gap-10 md:py-20">
            <figure className="relative aspect-[3/2] min-w-0 overflow-hidden md:col-span-6 md:aspect-auto md:h-[min(66.6667svh,40rem)] lg:col-span-5">
              <HomeHeroPhotos />
            </figure>

            <div className="flex min-w-0 flex-col gap-8 md:col-span-6 md:h-[min(66.6667svh,40rem)] md:justify-between md:gap-10 lg:col-span-7">
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {SITE_NAME}
                </p>
                <h1 className="tfl-title text-5xl text-foreground md:text-6xl lg:text-7xl">
                  Create a live station display
                </h1>
              </div>
              <div className="space-y-6 md:space-y-8">
                <p className="max-w-xl text-lg text-foreground md:text-xl">
                  Configure a display for a station, explore TfL data, or use
                  the React components in your own project.
                </p>
                <div className="flex flex-col items-start gap-3">
                  <Link
                    href="/board"
                    className="inline-flex w-fit items-center gap-1.5 text-lg text-foreground underline underline-offset-4 md:text-xl"
                  >
                    Create a display
                    <ArrowRightIcon
                      className="size-[2ex] shrink-0"
                      strokeWidth={3}
                      absoluteStrokeWidth
                      aria-hidden
                    />
                  </Link>
                  <Link
                    href="/docs/components"
                    className="text-base text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    React components
                  </Link>
                  <Link
                    href="/docs/explorer"
                    className="text-base text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    Explorer
                  </Link>
                </div>
              </div>
            </div>
          </div>
        }
      />
    </div>
  )
}
