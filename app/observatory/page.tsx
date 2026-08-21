import { Suspense } from "react"
import type { Metadata } from "next"
import { connection } from "next/server"
import {
  ObservatoryFallback,
  ObservatoryView,
} from "@/components/observatory/observatory-view"
import { loadObservatoryPageData } from "@/lib/tfl/observatory/load-page-data"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = pageMetadata({
  title: "TfL metadata",
  description:
    "Independent observation of TfL line, stop, and route metadata. Not line status.",
  path: "/observatory",
})

const ObservatoryBody = async () => {
  await connection()
  const data = await loadObservatoryPageData()
  return <ObservatoryView data={data} />
}

export default function ObservatoryPage() {
  return (
    <Suspense fallback={<ObservatoryFallback />}>
      <ObservatoryBody />
    </Suspense>
  )
}
