"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronLeftIcon } from "lucide-react"
import { SQUARE_BUTTON } from "@/components/board/customise/parts"
import type { CustomiseController } from "@/components/board/customise/types"
import { CUSTOMISE_PANEL_LABEL } from "@/lib/tfl/board-customise"
import { cn } from "@/lib/utils"

const withEmbed = (href: string) => {
  const url = new URL(href, "https://tfl.manglekuo.com")
  url.searchParams.set("embed", "1")
  return `${url.pathname}${url.search}${url.hash}`
}

/**
 * Q7: on a phone the variant is a full page (100svh) with Done and a sticky
 * footer: Preview (a fixed 30svh board over the list, so nothing moves) and
 * Open Board. From md up it sits in the builder's left column next to the
 * live preview, so the footer is not needed. A part's editor (R) is a page
 * of its own: a back chevron in the header, no footer, and back returns to
 * where the list was scrolled.
 */
export const CustomiseShell = ({
  api,
  label,
  onOpenBoard,
  children,
}: {
  api: CustomiseController
  label: string
  onOpenBoard: () => void
  children: ReactNode
}) => {
  const [preview, setPreview] = useState(false)
  const heading = useRef<HTMLHeadingElement | null>(null)
  const scroller = useRef<HTMLDivElement | null>(null)
  const listScroll = useRef(0)
  const editing = api.editing
  const shownPage = useRef<typeof editing | undefined>(undefined)
  useEffect(() => {
    const first = shownPage.current === undefined
    if (shownPage.current === editing) return
    shownPage.current = editing
    if (!first && scroller.current) {
      scroller.current.scrollTop = editing ? 0 : listScroll.current
    }
    if (!first || window.matchMedia("(max-width: 47.999rem)").matches)
      heading.current?.focus({ preventScroll: true })
  }, [editing])
  const back = api.busAdding
    ? () => api.setBusAdding(false)
    : editing
      ? () => api.openEditor(null)
      : undefined
  return (
    <section
      aria-labelledby="customise-title"
      data-customise={api.variant}
      className={cn(
        "fixed inset-0 z-50 flex h-[100svh] flex-col bg-background",
        "md:static md:z-auto md:h-auto md:bg-transparent"
      )}
    >
      <div className="flex min-h-12 shrink-0 items-center justify-between border-b border-border px-4 md:px-0">
        <h2
          id="customise-title"
          ref={heading}
          tabIndex={-1}
          className="flex items-center text-base font-medium outline-none"
        >
          {back ? (
            <button
              type="button"
              aria-label="Back to Customise"
              // A 20 px glyph where the mockup has it; the target runs to 44 px.
              className="relative -ml-2 mr-1 inline-flex h-11 w-5 items-center justify-center outline-none after:absolute after:inset-y-0 after:-right-3 after:-left-3 focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={back}
            >
              <ChevronLeftIcon className="size-5" aria-hidden />
            </button>
          ) : null}
          {editing ? CUSTOMISE_PANEL_LABEL[editing] : label}
        </h2>
        <button
          type="button"
          className="min-h-11 px-2 text-sm font-medium"
          onClick={api.done}
        >
          Done
        </button>
      </div>
      <div
        ref={scroller}
        onScroll={(event) => {
          if (!editing) listScroll.current = event.currentTarget.scrollTop
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:overflow-visible md:px-0"
      >
        <div className="mx-auto max-w-md space-y-5">{children}</div>
      </div>
      {editing ? null : (
        <div className="relative shrink-0 border-t border-border md:hidden">
          {preview ? (
            <div className="absolute inset-x-0 bottom-full h-[30svh] border-t border-border bg-background">
              <iframe
                title="Board preview (small)"
                src={withEmbed(api.href)}
                className="size-full border-0"
              />
            </div>
          ) : null}
          <div className="grid grid-cols-2">
            <button
              type="button"
              aria-pressed={preview}
              className={cn(SQUARE_BUTTON, "min-h-12 border-0 border-r")}
              onClick={() => setPreview((value) => !value)}
            >
              {preview ? "Hide preview" : "Preview"}
            </button>
            <a
              href={api.href}
              className="inline-flex min-h-12 items-center justify-center bg-foreground text-sm font-medium text-background"
              onClick={onOpenBoard}
            >
              Open Board
            </a>
          </div>
        </div>
      )}
    </section>
  )
}
