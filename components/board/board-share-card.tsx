"use client"

import { useMemo, useState } from "react"
import { CheckIcon, CopyIcon, ExternalLinkIcon, QrCodeIcon } from "lucide-react"
import { encode } from "uqr"
import { BoardQrSvg } from "@/components/board/board-qr-svg"
import { BoardShareButton } from "@/components/board/board-share-button"
import { FeedbackTextLink } from "@/components/docs/feedback-text-link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

const COPIED_MS = 2000

type BoardShareCardProps = {
  /** `/b/<slug>` for this Board; the Share button needs it. */
  shortPath?: string
  shareTitle?: string
  url: string
  href: string
  onOpen?: () => void
  onCopy?: () => void
  onQrRendered?: () => void
}

export const BoardShareCard = ({
  shortPath,
  shareTitle = "Live board · Board",
  url,
  href,
  onOpen,
  onCopy,
  onQrRendered,
}: BoardShareCardProps) => {
  const [copied, setCopied] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const matrix = useMemo(
    () => (url ? encode(url, { ecc: "M", border: 2 }) : null),
    [url]
  )
  const size = matrix?.size ?? 0
  const cells = matrix?.data ?? []

  const handleCopy = () => {
    if (!url) return
    onCopy?.()
    void navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), COPIED_MS)
      },
      () => undefined
    )
  }

  const handleQrOpenChange = (open: boolean) => {
    setQrOpen(open)
    if (open) onQrRendered?.()
  }

  return (
    <section className="space-y-2" aria-label="Share">
      {shortPath ? (
        <BoardShareButton
          url={shortPath}
          title={shareTitle}
          className="w-full"
        />
      ) : null}
      <Button
        nativeButton={false}
        size="lg"
        className="h-10 w-full px-3.5"
        render={
          <a href={href} target="_blank" rel="noreferrer" onClick={onOpen} />
        }
      >
        <ExternalLinkIcon data-icon="inline-start" />
        Open Board
      </Button>
      <Input
        readOnly
        value={url}
        aria-label="Board URL"
        className="w-full font-mono text-base"
        onFocus={(event) => event.currentTarget.select()}
      />
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-10 px-3.5"
          onClick={handleCopy}
          disabled={!url}
          aria-live="polite"
        >
          {copied ? (
            <CheckIcon data-icon="inline-start" />
          ) : (
            <CopyIcon data-icon="inline-start" />
          )}
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-10 px-3.5"
          onClick={() => handleQrOpenChange(true)}
          disabled={!matrix}
        >
          <QrCodeIcon data-icon="inline-start" />
          Show QR code
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Having trouble?{" "}
        <FeedbackTextLink className="text-muted-foreground no-underline hover:text-foreground hover:underline">
          Feedback
        </FeedbackTextLink>
      </p>

      <Dialog open={qrOpen} onOpenChange={handleQrOpenChange}>
        <DialogContent className="w-[min(40rem,calc(100vw-1.5rem))] max-w-none p-6 sm:max-w-none">
          <DialogHeader>
            <DialogTitle className="sr-only">Board QR code</DialogTitle>
          </DialogHeader>
          {matrix ? (
            <div className="flex justify-center rounded-lg bg-white p-4">
              <BoardQrSvg
                url={url}
                size={size}
                cells={cells}
                className="size-[min(80vmin,32rem)]"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}
