import type { Metadata } from "next"
import { Suspense } from "react"
import { PlaceholderRoundelSpinLabLoader } from "./lab-loader"

export const metadata: Metadata = {
  title: "Placeholder roundel spin (temp)",
  description:
    "Temp lab for designing and exporting the animated placeholder mark.",
  robots: { index: false, follow: false },
}

export default function PlaceholderRoundelSpinTempPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">Loading spin lab…</p>
      }
    >
      <p className="sr-only">
        Temp placeholder-roundel spin lab — not linked in nav.
      </p>
      <PlaceholderRoundelSpinLabLoader />
    </Suspense>
  )
}
