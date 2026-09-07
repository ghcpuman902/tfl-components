"use client"

import type { ComparedCell, MatrixComparison } from "@/lib/tfl/investigate/candidates/types"
import { cn } from "@/lib/utils"

const labelOf = (id: string, names: Map<string, string>) => names.get(id) ?? id

const cellClass = (verdict: ComparedCell["verdict"], active: boolean) =>
  cn(
    "h-9 min-w-9 border border-border text-center text-xs tabular-nums",
    verdict === "both" && "bg-emerald-500/15 text-foreground",
    verdict === "neither" && "bg-muted/40 text-muted-foreground",
    verdict === "missing" && "bg-destructive/20 text-destructive",
    verdict === "extra" && "bg-amber-500/25 text-foreground",
    active && "outline-2 outline-offset-[-2px] outline-foreground"
  )

const cellMark = (verdict: ComparedCell["verdict"]) => {
  if (verdict === "both") return "✓"
  if (verdict === "neither") return "·"
  if (verdict === "missing") return "−"
  return "+"
}

export const CandidateMatrix = ({
  comparison,
  names,
  active,
  onHover,
  onSelect,
}: {
  comparison: MatrixComparison
  names: Map<string, string>
  active: { a: string; b: string } | null
  onHover: (cell: { a: string; b: string } | null) => void
  onSelect: (cell: { a: string; b: string }) => void
}) => {
  const order = comparison.order
  const byKey = new Map(
    comparison.cells.map((cell) => [`${cell.a}|${cell.b}`, cell])
  )
  const isActive = (a: string, b: string) =>
    active != null &&
    ((active.a === a && active.b === b) || (active.a === b && active.b === a))

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-2">
        {comparison.exact ? (
          <p className="text-sm font-medium text-foreground">Exact match</p>
        ) : (
          <p className="text-sm font-medium text-foreground">
            {comparison.missing} missing · {comparison.extra} extra
          </p>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse">
          <caption className="sr-only">
            Reconstructed movement matrix compared with the source matrix
          </caption>
          <thead>
            <tr>
              <th className="border border-border bg-muted/40 p-1.5 text-left text-[11px] font-medium text-muted-foreground">
                via candidate
              </th>
              {order.map((id) => (
                <th
                  key={id}
                  className="border border-border bg-muted/40 p-1.5 text-left text-[11px] font-medium text-muted-foreground"
                >
                  {labelOf(id, names)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.map((row) => (
              <tr key={row}>
                <th className="border border-border bg-muted/40 p-1.5 text-left text-[11px] font-medium text-muted-foreground">
                  {labelOf(row, names)}
                </th>
                {order.map((column) => {
                  if (row === column) {
                    return (
                      <td
                        key={column}
                        className="border border-border bg-muted/20 text-center text-muted-foreground"
                      >
                        —
                      </td>
                    )
                  }
                  const cell =
                    byKey.get(`${row}|${column}`) ?? byKey.get(`${column}|${row}`)
                  if (!cell) {
                    return (
                      <td key={column} className="border border-border" />
                    )
                  }
                  const handleActivate = () => onSelect({ a: cell.a, b: cell.b })
                  return (
                    <td key={column} className="p-0">
                      <button
                        type="button"
                        className={cn(
                          cellClass(cell.verdict, isActive(cell.a, cell.b)),
                          "flex w-full cursor-pointer items-center justify-center"
                        )}
                        aria-label={`${labelOf(cell.a, names)} to ${labelOf(cell.b, names)}: ${cell.verdict}`}
                        aria-pressed={isActive(cell.a, cell.b)}
                        onMouseEnter={() => onHover({ a: cell.a, b: cell.b })}
                        onMouseLeave={() => onHover(null)}
                        onFocus={() => onHover({ a: cell.a, b: cell.b })}
                        onBlur={() => onHover(null)}
                        onClick={handleActivate}
                      >
                        {cellMark(cell.verdict)}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <li>✓ both</li>
        <li>· neither</li>
        <li className="text-destructive">− source only</li>
        <li>+ candidate only</li>
      </ul>
    </div>
  )
}
