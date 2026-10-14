import type { Metadata } from "next"
import { HomeViewRedirect } from "@/components/board/homeview-redirect"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = pageMetadata({
  title: "Board for HomeView",
  description:
    "Open the hosted Board in glance mode for an Apple HomeView Safari tab.",
  path: "/homeview",
})

/** Hash fragment cannot be set by a server redirect — client replace adds it. */
export default function HomeViewPage() {
  return <HomeViewRedirect />
}
