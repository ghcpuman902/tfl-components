"use client"

import { useEffect, useState } from "react"
import { HOME_HERO_SLIDES } from "@/components/docs/home-hero-photos"

type MirrorPhotoLoopProps = {
  startOffset: number
  frozen: boolean
}

export const MirrorPhotoLoop = ({
  startOffset,
  frozen,
}: MirrorPhotoLoopProps) => {
  const [index, setIndex] = useState(startOffset % HOME_HERO_SLIDES.length)
  const slide = HOME_HERO_SLIDES[index] ?? HOME_HERO_SLIDES[0]

  useEffect(() => {
    if (frozen) return
    const id = window.setInterval(
      () => {
        setIndex((current) => (current + 1) % HOME_HERO_SLIDES.length)
      },
      4200 + startOffset * 400
    )
    return () => window.clearInterval(id)
  }, [frozen, startOffset])

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
