"use client"

import { useEffect, useState } from "react"
import type { HomeHeroSlide } from "@/components/docs/home-hero-photos"

type MirrorPhotoLoopProps = {
  slides: readonly HomeHeroSlide[]
  frozen: boolean
  intervalMs: number
}

export const MirrorPhotoLoop = ({
  slides,
  frozen,
  intervalMs,
}: MirrorPhotoLoopProps) => {
  const [index, setIndex] = useState(0)
  const slide = slides[index] ?? slides[0]

  useEffect(() => {
    if (frozen || slides.length < 2) return
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [frozen, intervalMs, slides.length])

  if (!slide) return null

  return (
    <div
      className="size-full overflow-hidden"
      style={{ width: "100%", height: "100%" }}
    >
      {/* Native img keeps Display P3 ICC; next/image can strip wide-gamut profiles. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slide.src}
        alt=""
        width={slide.width}
        height={slide.height}
        aria-hidden
        className="size-full object-cover"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  )
}
