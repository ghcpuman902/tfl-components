"use client"

import dynamic from "next/dynamic"

const PlaceholderRoundelSpinLab = dynamic(
  () => import("./lab-client").then((mod) => mod.PlaceholderRoundelSpinLab),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground">Loading spin lab…</p>
    ),
  }
)

export const PlaceholderRoundelSpinLabLoader = () => (
  <PlaceholderRoundelSpinLab />
)
