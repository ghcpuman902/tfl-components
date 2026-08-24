import type { Metadata } from "next"
import { OgPreviewGate } from "@/components/og/og-preview-gate"
import { OpenGraphCard } from "@/components/og/open-graph-card"

export const metadata: Metadata = {
  title: "Open Graph preview",
  robots: { index: false, follow: false },
}

const adobeFontsKitId = process.env.NEXT_PUBLIC_ADOBE_FONTS_KIT_ID

export default function OgPreviewPage() {
  if (!adobeFontsKitId) {
    return (
      <div className="flex h-[630px] w-[1200px] items-center bg-white px-[88px] text-sm text-neutral-600">
        Set NEXT_PUBLIC_ADOBE_FONTS_KIT_ID to capture P22 Underground.
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-white text-[#0a0a0a]">
      <style>{`
        nextjs-portal,
        [data-next-badge-root],
        [data-nextjs-dev-indicator] { display: none !important; }
      `}</style>
      <OgPreviewGate kitId={adobeFontsKitId}>
        <OpenGraphCard />
      </OgPreviewGate>
    </div>
  )
}
