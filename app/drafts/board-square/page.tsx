import type { Metadata } from "next"
import { BoardSquareDraft } from "@/app/drafts/board-square/workspace"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = pageMetadata({
  title: "Square board draft",
  description: "Room-distance HomeView-class Board layout with fixture arrivals.",
  path: "/drafts/board-square",
  robots: { index: false, follow: false },
})

export default function BoardSquareDraftPage() {
  return <BoardSquareDraft />
}
