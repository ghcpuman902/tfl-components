"use client"

import { useState, type ReactNode } from "react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TFL_BRAND_LINKS } from "@/lib/tfl/roundel-presets"

const ROUNDEL_FRAME_CLASS =
  "inline-flex size-10 shrink-0 items-center justify-center leading-none [&>svg]:block [&>svg]:size-full [&>img]:block [&>img]:size-full"

type RoundelTrademarkModalProps = {
  className?: string
  children: ReactNode
}

/**
 * Dev-only trademark notice for the placeholder roundel.
 * Kept in a client module so production SVG marks stay server-renderable.
 */
export const RoundelTrademarkModal = ({
  className,
  children,
}: RoundelTrademarkModalProps) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            asChild
            className={cn(ROUNDEL_FRAME_CLASS, "cursor-help", className)}
          >
            {/* span (not button) so this stays valid inside links / other controls.
                `asChild` works against either a Radix-shaped `asChild` primitive
                (most shadcn consumers) or this project's Base UI `render` shim
                — see components/ui/tooltip.tsx. */}
            <span
              role="button"
              tabIndex={0}
              aria-label="TfL roundel placeholder — trademark notice"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setOpen(true)
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return
                event.preventDefault()
                event.stopPropagation()
                setOpen(true)
              }}
            >
              {children}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[14rem]">
            Trademark placeholder. Click for details.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Trademark placeholder</DialogTitle>
            <DialogDescription>
              The TfL roundel is a registered trademark. This library ships a
              filled, rounded stand-in by default so demos stay safe.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Opting in with{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                NEXT_PUBLIC_ALLOW_TFL_ROUNDEL=true
              </code>{" "}
              means <em className="text-foreground">your</em> app accepts
              trademark responsibility for showing the real mark.
            </p>
            <p>
              For licensing, logo requests, and design rules, use TfL&apos;s own
              brand guidance — not this package.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            <a
              href={TFL_BRAND_LINKS.usingBrandIp}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants())}
            >
              TfL brand IP guide
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
