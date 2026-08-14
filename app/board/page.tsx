import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BoardBuilder } from "@/components/board/board-builder";
import { BoardWipNotice } from "@/components/board/board-wip-notice";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { getDocsEntry } from "@/lib/docs-catalog";

export const metadata: Metadata = {
  title: "Board",
  description:
    "Leave a URL running fullscreen, with one station's arrivals and Tube status in a side slot.",
};

export default function BoardBuilderPage() {
  const entry = getDocsEntry("board-index");
  if (!entry) notFound();

  return (
    <DocsReadableWidth>
      <article className="space-y-10">
        <DocsPageHeader
          entry={entry}
          isNew
          notice={<BoardWipNotice />}
        />

        <section className="space-y-3">
          <p className="max-w-prose text-muted-foreground">
            This page builds a URL you can leave running fullscreen. No Next
            app to host. The board calls TfL from the browser with your key, the
            same one as Docs, filled in if you already added it. The key stays
            in the hash fragment, so it never reaches our servers.
          </p>
          <p className="max-w-prose text-muted-foreground">
            One layout for now. Arrivals for a single station, Tube and rail
            status in a narrow slot beside it. Find a stop id in{" "}
            <Link
              href="/docs/explorer"
              className="text-foreground underline underline-offset-4"
            >
              Explorer
            </Link>
            . Generate the URL below.
          </p>
        </section>

        <BoardBuilder />
      </article>
    </DocsReadableWidth>
  );
}
