import { headers } from "next/headers"
import { heroArtworkThemeStyleSheet } from "@/app/temp/landing-palette/palette"
import { HomeEditorial } from "@/components/docs/home-editorial"
import { HomeHeroPhotos } from "@/components/docs/home-hero-photos"
import { LandingAnalytics } from "@/components/landing/landing-analytics"
import { LandingRoomVariant } from "@/components/landing/landing-room-variant"
import { LandingSimpleVariant } from "@/components/landing/landing-simple-variant"
import { defaultAnalyticsContext } from "@/lib/analytics/context"
import { readLandingAssignment } from "@/lib/landing/assignment"
import { SITE_NAME } from "@/lib/site"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

type LandingPageProps = {
  searchParams: Record<string, string | string[] | undefined>
}

const CurrentHomepage = () => (
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
                Configure a display for a station, explore TfL data, or use the
                React components in your own project.
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

export const LandingPage = async ({ searchParams }: LandingPageProps) => {
  const headerList = await headers()
  const viewportHint = headerList.get("sec-ch-viewport-width")
  const viewportWidth = viewportHint ? Number.parseInt(viewportHint, 10) : 1280
  const assignment = await readLandingAssignment({
    searchParams,
    viewportWidth: Number.isFinite(viewportWidth) ? viewportWidth : 1280,
  })

  if (assignment.variant === "control") {
    return (
      <>
        <LandingAnalytics context={defaultAnalyticsContext("control")} />
        <CurrentHomepage />
      </>
    )
  }

  return (
    <>
      <LandingAnalytics context={assignment.context} />
      {assignment.variant === "room" ? (
        <>
          <style>{heroArtworkThemeStyleSheet()}</style>
          <LandingRoomVariant context={assignment.context} />
        </>
      ) : (
        <LandingSimpleVariant context={assignment.context} />
      )}
    </>
  )
}

export const LandingControlFallback = CurrentHomepage
