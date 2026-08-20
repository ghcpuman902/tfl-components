"use client"

import type { Ref } from "react"
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site"

type HeroCopyPanelProps = {
  copyRef: Ref<HTMLElement | null>
}

export const HeroCopyPanel = ({ copyRef }: HeroCopyPanelProps) => (
  <section
    ref={copyRef}
    className="absolute top-[16%] left-4 z-10 max-w-md text-left text-[#3f2a1c] md:left-8 lg:left-12"
  >
    <p className="text-sm font-medium text-[#3f2a1c]/75">{SITE_NAME}</p>
    <h1 className="tfl-title mt-2 text-4xl md:text-5xl lg:text-6xl">
      Create a live station display
    </h1>
    <p className="mt-4 max-w-sm text-base text-[#3f2a1c]/85 md:text-lg">
      {SITE_DESCRIPTION}
    </p>
  </section>
)
