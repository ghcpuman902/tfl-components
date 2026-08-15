import { Suspense } from "react"
import type { Metadata } from "next"
import { HeroCanvas } from "@/components/drafts/hero-3d/hero-canvas"

export const metadata: Metadata = {
  title: "3D hero prototype",
  description:
    "Experimental domestic interior for a future TfL Components landing page.",
  robots: { index: false, follow: false },
}

const CanvasFallback = () => (
  <div className="min-h-dvh w-full bg-[#d7c7b0]" aria-hidden />
)

export default function Hero3dDraftPage() {
  return (
    <Suspense fallback={<CanvasFallback />}>
      <HeroCanvas />
    </Suspense>
  )
}
