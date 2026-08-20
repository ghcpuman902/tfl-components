"use client"

import { useMemo } from "react"
import { encode } from "uqr"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BOARD_KEY_MODE_LABEL, type BoardKeyMode } from "@/lib/tfl/board-share"

type BoardQrDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  mode: BoardKeyMode
}

const qrMatrix = (url: string) => encode(url, { ecc: "M", border: 4 })

export const BoardQrDialog = ({
  open,
  onOpenChange,
  url,
  mode,
}: BoardQrDialogProps) => {
  const matrix = useMemo(() => (url ? qrMatrix(url) : null), [url])
  const size = matrix?.size ?? 0
  const cells = matrix?.data ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby="board-qr-copy">
        <DialogHeader>
          <DialogTitle>Board QR code</DialogTitle>
          <DialogDescription id="board-qr-copy">
            {mode === "browser"
              ? "This code does not include the API key. The other device needs its own key."
              : "This code includes the API key in the link. Anyone with the complete link can use the key and its quota."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {BOARD_KEY_MODE_LABEL[mode]}
          </p>
          {matrix ? (
            <div className="flex justify-center rounded-lg bg-white p-3">
              <svg
                role="img"
                aria-label={`QR code for ${url}`}
                viewBox={`0 0 ${size} ${size}`}
                className="size-56 max-w-full text-black"
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
            </div>
          ) : null}
          <label className="block space-y-1">
            <span className="text-sm font-medium text-foreground">
              Board URL
            </span>
            <textarea
              readOnly
              value={url}
              rows={4}
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
              aria-label="Board URL"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              data-copy-text={url}
              aria-label="Copy board URL"
            >
              Copy URL
            </Button>
            <Button
              nativeButton={false}
              render={<a href={url} target="_blank" rel="noreferrer" />}
            >
              Open full display
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
