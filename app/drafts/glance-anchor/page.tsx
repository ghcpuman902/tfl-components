import type { Metadata } from "next"
import { Suspense } from "react"
import { GlanceAnchorMock, type GlanceAnchorLayout } from "./workspace"

export const metadata: Metadata = {
  title: "Draft: Glance anchor",
  description:
    "One anchor departure, quarter tiles and a segment bar for the Board glance view.",
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
    one(query.layout) === "household" ? "household" : "anchor"
  const active = one(query.active)
  const progress = one(query.p)

  return (
    <GlanceAnchorMock
      layout={layout}
      room={one(query.room) === "1"}
      touch={one(query.touch) === "1"}
      width={int(one(query.w), 390)}
      height={int(one(query.h), 844)}
      freeze={
        active === undefined
          ? undefined
          : {
              active: Number.parseInt(active, 10) || 0,
              progress: Math.min(1, Math.max(0, Number(progress ?? 0.6))),
            }
      }
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
