"use client"

import { useMemo, useState } from "react"
import { CheckIcon, CopyIcon, ExternalLinkIcon, QrCodeIcon } from "lucide-react"
import { encode } from "uqr"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const COPIED_MS = 2000

type BoardQrSvgProps = {
  url: string
  size: number
  cells: boolean[][]
  className?: string
}

const BoardQrSvg = ({ url, size, cells, className }: BoardQrSvgProps) => (
  <svg
    role="img"
    aria-label={`QR code for ${url}`}
    viewBox={`0 0 ${size} ${size}`}
    className={cn("text-black", className)}
    shapeRendering="crispEdges"
  >
    <rect width={size} height={size} fill="white" />
    {cells.map((row, y) =>
      row.map((on, x) =>
        on ? (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width={1}
            height={1}
            fill="currentColor"
          />
        ) : null
      )
    )}
  </svg>
)

type BoardShareCardProps = {
  url: string
  href: string
  onOpen?: () => void
  onCopy?: () => void
  onQrRendered?: () => void
}

export const BoardShareCard = ({
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
        className="w-full font-mono text-xs"
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
