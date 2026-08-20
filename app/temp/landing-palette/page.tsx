import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Metadata } from "next"
import { LandingPaletteCompareView } from "./compare-view"

export const metadata: Metadata = {
  title: "Landing palette (temp)",
  description:
    "Temp: OKLCH merge and light-mode tokens for the landing room SVG, before applying them to the 3D hero.",
  robots: { index: false, follow: false },
}

const svg = readFileSync(
  join(process.cwd(), "public/images/landing/landing-palette.svg"),
  "utf8",
)

export default function LandingPaletteTempPage() {
  return <LandingPaletteCompareView svg={svg} />
}
