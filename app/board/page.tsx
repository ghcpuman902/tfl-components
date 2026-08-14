import type { Metadata } from "next"
import { BoardBuilder } from "@/components/board/board-builder"
import { BoardWipNotice } from "@/components/board/board-wip-notice"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"

export const metadata: Metadata = {
  title: "Board",
  description:
    "The quickest way to turn an old iPad or tablet into a TfL dashboard.",
}

export default function BoardBuilderPage() {
  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <header>
          <h1 className="tfl-title text-3xl text-foreground">Board</h1>
          <p className="mt-2 max-w-prose text-lg text-muted-foreground">
            The quickest way to turn an old iPad or tablet into a TfL dashboard.
          </p>
          <BoardWipNotice />
        </header>

        <BoardBuilder />
      </article>
    </DocsReadableWidth>
  )
}
