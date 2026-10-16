import type { Metadata } from "next"
import { BoardGlanceDraft } from "@/app/drafts/board-glance/workspace"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = pageMetadata({
  title: "Glance board draft",
  description:
    "Room-distance Board glance mode across square, landscape, portrait, and phone frames.",
  path: "/drafts/board-glance",
  robots: { index: false, follow: false },
})

export default function BoardGlanceDraftPage() {
  return <BoardGlanceDraft />
}
