import {
  CloudDownload,
  Combine,
  PenLine,
  type LucideIcon,
} from "lucide-react"
import {
  MAP_PRODUCT_USE_LABEL,
  NETWORK_MODEL_CLASSIFICATION_LABEL,
  SOURCE_ORIGIN_LABEL,
  type NetworkModelClassification,
  type SourceOrigin,
} from "@/lib/tfl/network-model/types"
import { NETWORK_MODEL_STATUS } from "@/lib/tfl/network-model/status"
import { cn } from "@/lib/utils"

const CLASSIFICATION_CLASS: Record<NetworkModelClassification, string> = {
  sufficient:
    "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  fetch: "bg-sky-500/10 text-sky-800 dark:text-sky-300",
  process: "bg-amber-500/10 text-amber-900 dark:text-amber-300",
  external: "bg-rose-500/10 text-rose-800 dark:text-rose-300",
  author: "bg-violet-500/10 text-violet-800 dark:text-violet-300",
}

const CLASSIFICATION_BLURB: Record<NetworkModelClassification, string> = {
  sufficient: "Ready to draw.",
  fetch: "Official data exists; not in the small set yet.",
  process: "Derived from sources so it can be refreshed.",
  external: "Not available for this mode yet.",
  author: "We decide what belongs on each map.",
}

const ORIGIN_ICON: Record<SourceOrigin, LucideIcon> = {
  "api-native": CloudDownload,
  processed: Combine,
  authored: PenLine,
}

const ClassificationChip = ({
  classification,
}: {
  classification: NetworkModelClassification
}) => (
  <span
    className={cn(
      "inline-flex rounded-none px-1.5 py-0.5 text-xs font-medium",
      CLASSIFICATION_CLASS[classification],
    )}
  >
    {NETWORK_MODEL_CLASSIFICATION_LABEL[classification]}
  </span>
)

const OriginLabel = ({ origin }: { origin: SourceOrigin }) => {
  const Icon = ORIGIN_ICON[origin]
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      {SOURCE_ORIGIN_LABEL[origin]}
    </span>
  )
}

const PUBLIC_ROWS = NETWORK_MODEL_STATUS.filter((row) => row.usedOn)

const USED_CLASSIFICATIONS = [
  ...new Set(PUBLIC_ROWS.map((row) => row.classification)),
] as NetworkModelClassification[]

export const NetworkModelStatusLegend = () => (
  <ul className="my-4 max-w-prose space-y-2 text-sm leading-6">
    {USED_CLASSIFICATIONS.map((classification) => (
      <li key={classification} className="flex items-start gap-2">
        <ClassificationChip classification={classification} />
        <span className="text-muted-foreground">
          {CLASSIFICATION_BLURB[classification]}
        </span>
      </li>
    ))}
  </ul>
)

export const NetworkModelStatusTable = () => (
  <div className="my-6 w-full overflow-x-auto">
    <table className="w-full caption-bottom text-sm">
      <caption className="sr-only">
        Network-model records the four maps draw, with readiness, origin, and use
      </caption>
      <thead className="[&_tr]:border-b">
        <tr className="m-0 border-t border-b p-0">
          <th className="h-10 border px-4 py-2 text-left align-middle font-bold">
            Record
          </th>
          <th className="h-10 border px-4 py-2 text-left align-middle font-bold">
            Status
          </th>
          <th className="h-10 border px-4 py-2 text-left align-middle font-bold">
            Origin
          </th>
          <th className="h-10 border px-4 py-2 text-left align-middle font-bold">
            Maps
          </th>
          <th className="h-10 border px-4 py-2 text-left align-middle font-bold">
            What it is
          </th>
        </tr>
      </thead>
      <tbody className="[&_tr:last-child]:border-0">
        {PUBLIC_ROWS.map((row) => (
          <tr
            key={`${row.record}:${row.coverage ?? "all"}`}
            className="m-0 border-t border-b p-0"
          >
            <td className="border px-4 py-2 text-left align-top">
              <span className="font-medium">{row.record}</span>
              {row.coverage ? (
                <span className="mt-0.5 block text-muted-foreground">
                  {row.coverage}
                </span>
              ) : null}
            </td>
            <td className="border px-4 py-2 text-left align-top whitespace-nowrap">
              <ClassificationChip classification={row.classification} />
            </td>
            <td className="border px-4 py-2 text-left align-top whitespace-nowrap">
              <OriginLabel origin={row.origin} />
            </td>
            <td className="border px-4 py-2 text-left align-top whitespace-nowrap">
              {row.usedOn ? MAP_PRODUCT_USE_LABEL[row.usedOn] : null}
            </td>
            <td className="border px-4 py-2 text-left align-top min-w-56">
              {row.summary}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
