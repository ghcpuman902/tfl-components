"use client"

import { useMemo, useState } from "react"
import {
  CheckIcon,
  CopyIcon,
  MailIcon,
  MessageCircleIcon,
  QrCodeIcon,
  ShareIcon,
} from "lucide-react"
import { encode } from "uqr"
import { BoardQrSvg } from "@/components/board/board-qr-svg"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { shareTargets } from "@/lib/tfl/board-shared-arrival"
import { cn } from "@/lib/utils"

const COPIED_MS = 2000

const TILE_STYLE: Record<string, string> = {
  messages: "bg-[#34C759] text-white",
  whatsapp: "bg-[#25D366] text-white",
  x: "bg-black text-white",
  mail: "bg-[#1E90FF] text-white",
}

const TileIcon = ({ id }: { id: string }) => {
  if (id === "mail") return <MailIcon className="size-6" />
  if (id === "x") return <span className="text-xl font-semibold">X</span>
  return <MessageCircleIcon className="size-6" />
}

type BoardShareButtonProps = {
  /** Short link, absolute or site-relative (resolved against this origin). */
  url: string
  title: string
  className?: string
  variant?: "pill" | "link"
}

/**
 * Share for a short Board link: the phone's own share sheet where there is
 * one, else Board's sheet with app links, copy and QR.
 */
export const BoardShareButton = ({
  url: href,
  title,
  className,
  variant = "pill",
}: BoardShareButtonProps) => {
  const [url, setUrl] = useState(href)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const matrix = useMemo(
    () => (qrOpen ? encode(url, { ecc: "M", border: 2 }) : null),
    [qrOpen, url]
  )

  const handleShare = async () => {
    const url = new URL(href, window.location.origin).href
    setUrl(url)
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
      }
    }
    setSheetOpen(true)
  }

  const handleCopy = () => {
    void navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), COPIED_MS)
      },
      () => undefined
    )
  }

  return (
    <>
      {variant === "pill" ? (
        <Button
          type="button"
          size="lg"
          className={cn("h-10 rounded-full px-4", className)}
          onClick={handleShare}
        >
          <ShareIcon data-icon="inline-start" />
          Share
        </Button>
      ) : (
        <button type="button" className={className} onClick={handleShare}>
          Share
        </button>
      )}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-w-lg rounded-t-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="flex-row items-center gap-3 border-b pb-3 text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${url}/og`}
              alt=""
              width={96}
              height={50}
              className="h-[50px] w-24 shrink-0 rounded border object-cover"
            />
            <div className="min-w-0">
              <SheetTitle className="truncate">{title}</SheetTitle>
              <SheetDescription className="truncate">
                {url.replace(/^https?:\/\//, "")}
              </SheetDescription>
            </div>
          </SheetHeader>
          <div className="grid grid-cols-4 gap-2 px-4">
            {shareTargets(url, title).map((target) => (
              <a
                key={target.id}
                href={target.href}
                target={
                  target.id === "messages" || target.id === "mail"
                    ? undefined
                    : "_blank"
                }
                rel="noreferrer"
                className="flex flex-col items-center gap-1.5 text-xs"
              >
                <span
                  className={cn(
                    "flex size-14 items-center justify-center rounded-2xl",
                    TILE_STYLE[target.id]
                  )}
                >
                  <TileIcon id={target.id} />
                </span>
                {target.label}
              </a>
            ))}
          </div>
          <div className="mx-4 divide-y overflow-hidden rounded-xl border">
            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-base"
              aria-live="polite"
            >
              {copied ? (
                <CheckIcon className="size-4" />
              ) : (
                <CopyIcon className="size-4" />
              )}
              {copied ? "Copied" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={() => setQrOpen((open) => !open)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-base"
            >
              <QrCodeIcon className="size-4" />
              {qrOpen ? "Hide QR code" : "Show QR code"}
            </button>
          </div>
          {matrix ? (
            <div className="mx-4 flex justify-center rounded-lg bg-white p-3">
              <BoardQrSvg
                url={url}
                size={matrix.size}
                cells={matrix.data}
                className="size-[min(60vw,16rem)]"
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
