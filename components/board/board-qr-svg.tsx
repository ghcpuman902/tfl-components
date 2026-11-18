import { cn } from "@/lib/utils"

type BoardQrSvgProps = {
  url: string
  size: number
  cells: boolean[][]
  className?: string
}

export const BoardQrSvg = ({
  url,
  size,
  cells,
  className,
}: BoardQrSvgProps) => (
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
