import type { Metadata } from "next"
import { Suspense } from "react"
import { GlanceAnchorMock, type GlanceAnchorLayout } from "./workspace"

export const metadata: Metadata = {
  title: "Draft: Glance anchor",
  description:
    "One anchor departure and quarter tiles that scroll or pan when there are more, for the Board glance view.",
  robots: { index: false, follow: false },
}

type Query = Record<string, string | string[] | undefined>
type DraftPageProps = { searchParams: Promise<Query> }

const one = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined

const int = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const MockBody = async ({ searchParams }: DraftPageProps) => {
  const query = await searchParams
  const layout: GlanceAnchorLayout =
    one(query.layout) === "pair" ? "pair" : "anchor"
  const pin = one(query.pin)
  const pan = one(query.pan)

  return (
    <GlanceAnchorMock
      layout={layout}
      room={one(query.room) === "1"}
      touch={one(query.touch) === "1"}
      overflow={one(query.overflow) === "1"}
      width={int(one(query.w), 390)}
      height={int(one(query.h), 844)}
      pin={pin === undefined ? undefined : Number.parseInt(pin, 10) || 0}
      pan={pan === undefined ? undefined : Math.max(0, Number(pan) || 0)}
    />
  )
}

export default function GlanceAnchorDraftPage({
  searchParams,
}: DraftPageProps) {
  return (
    <main className="flex min-h-svh items-start justify-center bg-muted p-6">
      <Suspense fallback={null}>
        <MockBody searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
