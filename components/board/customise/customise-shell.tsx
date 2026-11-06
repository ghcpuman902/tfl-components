"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { SQUARE_BUTTON } from "@/components/board/customise/parts"
import type { CustomiseController } from "@/components/board/customise/types"
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
 * live preview, so the footer is not needed.
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
  useEffect(() => {
    if (window.matchMedia("(max-width: 47.999rem)").matches)
      heading.current?.focus()
  }, [])
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
          className="text-base font-medium outline-none"
        >
          {label}
        </h2>
        <button
          type="button"
          className="min-h-11 px-2 text-sm font-medium"
          onClick={api.done}
        >
          Done
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:overflow-visible md:px-0">
        <div className="mx-auto max-w-md space-y-5">{children}</div>
      </div>
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
    </section>
  )
}
