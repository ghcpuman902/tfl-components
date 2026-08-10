"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type HeroSlide = {
  src: string;
  alt: string;
  caption: string;
  /** TfL premises or branded assets in frame — omit credit otherwise */
  tflCredit?: boolean;
  width: number;
  height: number;
  /** object-position; mobile landscape crops often need bottom anchor */
  objectClassName: string;
};

const SLIDES: readonly HeroSlide[] = [
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
    // Landscape: tall frame crops to middle; mobile 3:2 shows nearly the full frame
    objectClassName: "object-center",
  },
  {
    src: "/images/home/tower-42-bus.jpg",
    alt: "London red buses passing in front of Tower 42",
    caption: "London red buses passing in front of Tower 42.",
    tflCredit: true,
    width: 1400,
    height: 2111,
    // Keep street / bus in frame when the tall slot crops height
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
] as const;

const INTERVAL_MS = 5500;

export const HomeHeroPhotos = () => {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReduceMotion(media.matches);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const active = SLIDES[index] ?? SLIDES[0];

  return (
    <>
      {SLIDES.map((slide, slideIndex) => {
        const isActive = slideIndex === index;
        return (
          // Native img keeps Display P3 ICC; next/image can strip wide-gamut profiles.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={slide.src}
            src={slide.src}
            alt={isActive ? slide.alt : ""}
            width={slide.width}
            height={slide.height}
            decoding="async"
            fetchPriority={slideIndex === 0 ? "high" : "low"}
            aria-hidden={!isActive}
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity ease-out",
              slide.objectClassName,
              isActive ? "opacity-100" : "opacity-0",
              reduceMotion ? "duration-0" : "duration-[900ms]",
            )}
          />
        );
      })}
      <figcaption className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/50 to-transparent px-3 pb-3 pt-10 text-center text-[0.65rem] leading-relaxed text-balance text-white/80">
        {active.caption} Photo © MangleKuo.
        {active.tflCredit
          ? " TfL premises and marks © Transport for London."
          : null}
      </figcaption>
    </>
  );
};
