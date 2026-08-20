"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { PauseIcon, PlayIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type HomeHeroSlide = {
  src: string
  alt: string
  caption: string
  /** TfL premises or branded assets in frame — omit credit otherwise */
  tflCredit?: boolean
  width: number
  height: number
  /** object-position; mobile landscape crops often need bottom anchor */
  objectClassName: string
}

export const HOME_HERO_SLIDES: readonly HomeHeroSlide[] = [
  {
    src: "/images/home/wapping-station.jpg",
    alt: "Rotherhithe station platform, viewed from inside the station",
    caption: "Rotherhithe station.",
    tflCredit: true,
    width: 1400,
    height: 2111,
    objectClassName: "object-center",
  },
  {
    src: "/images/home/black-cabs.jpg",
    alt: "Black London taxi and white electric taxi near Tower Bridge",
    caption: "Black cabs near Tower Bridge.",
    width: 1400,
    height: 928,
    objectClassName: "object-center",
  },
  {
    src: "/images/home/tower-42-bus.jpg",
    alt: "London red buses passing in front of Tower 42",
    caption: "London red buses passing in front of Tower 42.",
    tflCredit: true,
    width: 1400,
    height: 2111,
    objectClassName: "object-bottom",
  },
  {
    src: "/images/home/cycle-signal.jpg",
    alt: "Black-and-white photograph of a cycle-lane traffic signal",
    caption: "Cycle signal.",
    width: 1400,
    height: 2111,
    objectClassName: "object-center",
  },
  {
    src: "/images/home/santander-cycles.jpg",
    alt: "Row of Santander Cycles at a docking station",
    caption: "Santander Cycles.",
    tflCredit: true,
    width: 1400,
    height: 2111,
    objectClassName: "object-bottom",
  },
  {
    src: "/images/home/thames-foreshore.jpg",
    alt: "People on the Thames foreshore at low tide",
    caption: "Thames foreshore.",
    width: 1400,
    height: 2111,
    objectClassName: "object-bottom",
  },
  {
    src: "/images/home/thames-busker.jpg",
    alt: "Busker with a guitar beside the Thames at dusk",
    caption: "Busker by the Thames.",
    width: 1400,
    height: 928,
    objectClassName: "object-center",
  },
]

const INTERVAL_MS = 5500
const STABLE_SLIDE = 0

const subscribeReducedMotion = (onChange: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)")
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

const getReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * First-fold LCP image only on initial HTML; later slides mount after idle so
 * ~3MB of carousel JPEGs do not contend with paint / TfL panel streaming.
 */
export const HomeHeroPhotos = () => {
  const [index, setIndex] = useState(STABLE_SLIDE)
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false
  )
  const [paused, setPaused] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [loadedThrough, setLoadedThrough] = useState(0)
  const [failedSrcs, setFailedSrcs] = useState<ReadonlySet<string>>(
    () => new Set()
  )

  useEffect(() => {
    let cancelled = false
    const unlockCarousel = () => {
      if (cancelled) return
      setHydrated(true)
      setLoadedThrough(1)
    }

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(unlockCarousel, {
        timeout: 1800,
      })
      return () => {
        cancelled = true
        window.cancelIdleCallback(idleId)
      }
    }

    const timeoutId = window.setTimeout(unlockCarousel, 400)
    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    if (!hydrated || reduceMotion || paused) return

    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % HOME_HERO_SLIDES.length)
    }, INTERVAL_MS)

    return () => window.clearInterval(id)
  }, [hydrated, reduceMotion, paused])

  const activeIndex = reduceMotion ? STABLE_SLIDE : index
  const active = HOME_HERO_SLIDES[activeIndex] ?? HOME_HERO_SLIDES[STABLE_SLIDE]
  const visibleThrough = Math.max(loadedThrough, activeIndex)
  const activeFailed = failedSrcs.has(active.src)

  const handleImageError = (src: string) => {
    setFailedSrcs((current) => {
      if (current.has(src)) return current
      const next = new Set(current)
      next.add(src)
      return next
    })
  }

  const handleTogglePaused = () => {
    setPaused((current) => !current)
  }

  return (
    <>
      <div className="absolute inset-0 bg-muted" aria-hidden />
      {HOME_HERO_SLIDES.map((slide, slideIndex) => {
        if (slideIndex > visibleThrough) return null

        const isActive = slideIndex === activeIndex
        if (failedSrcs.has(slide.src)) return null

        return (
          // Native img keeps Display P3 ICC; next/image can strip wide-gamut profiles.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={slide.src}
            src={slide.src}
            alt={isActive ? slide.alt : ""}
            width={slide.width}
            height={slide.height}
            decoding={slideIndex === 0 ? "sync" : "async"}
            loading={slideIndex === 0 ? "eager" : "lazy"}
            fetchPriority={slideIndex === 0 ? "high" : "low"}
            aria-hidden={!isActive}
            onError={() => handleImageError(slide.src)}
            className={cn(
              "absolute inset-0 size-full object-cover ease-out",
              slide.objectClassName,
              isActive ? "opacity-100" : "opacity-0",
              reduceMotion
                ? "transition-none"
                : "transition-opacity duration-[900ms]"
            )}
          />
        )
      })}
      {activeFailed ? (
        <p className="absolute inset-0 z-10 flex items-center justify-center px-4 text-center text-sm text-muted-foreground">
          Photo unavailable.
        </p>
      ) : null}
      {reduceMotion ? null : (
        <button
          type="button"
          className="absolute top-3 right-3 z-20 inline-flex size-8 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          onClick={handleTogglePaused}
          aria-pressed={paused}
          aria-label={
            paused ? "Resume photo slideshow" : "Pause photo slideshow"
          }
        >
          {paused ? (
            <PlayIcon className="size-4" aria-hidden />
          ) : (
            <PauseIcon className="size-4" aria-hidden />
          )}
        </button>
      )}
      <figcaption className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/50 to-transparent px-3 pt-10 pb-3 text-center text-[0.65rem] leading-relaxed text-balance text-white/80">
        {activeFailed ? "Photo unavailable. " : `${active.caption} `}
        Photo © MangleKuo.
        {active.tflCredit && !activeFailed
          ? " TfL premises and marks © Transport for London."
          : null}
      </figcaption>
    </>
  )
}
