"use client"

import dynamic from "next/dynamic"
import { HeroTuneProvider } from "@/components/drafts/hero-3d/hero-tune-context"
import { DebugPanel } from "@/components/drafts/hero-3d/debug-panel"

const CanvasSkeleton = () => (
  <div className="size-full min-h-dvh bg-[#d7c7b0]" aria-hidden />
)

const HeroScene = dynamic(
  () =>
    import("@/components/drafts/hero-3d/hero-scene").then(
      (mod) => mod.HeroScene
    ),
  { ssr: false, loading: CanvasSkeleton }
)

export const HeroCanvas = () => (
  <HeroTuneProvider>
    <div className="relative h-dvh w-full overflow-hidden">
      <HeroScene />
      <DebugPanel />
    </div>
  </HeroTuneProvider>
)
