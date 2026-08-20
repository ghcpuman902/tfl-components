import type { ReactNode } from "react"
import {
  Bike,
  Bus,
  CalendarCheck,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  Clock,
  CloudOff,
  GitCompare,
  MapPin,
  RefreshCw,
  Route,
  TriangleAlert,
  Waypoints,
  type LucideIcon,
} from "lucide-react"
import { ObservationChart } from "@/components/observatory/observation-chart"
import { ObservationHistory } from "@/components/observatory/observation-history"
import { ObservationTime } from "@/components/observatory/observation-time"
import { CHIP_CAP_TEXT_BOX_CLASS } from "@/components/tfl/arrivals/chip-text"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  observatoryStateHint,
  observatoryStateLabel,
} from "@/lib/tfl/observatory/format"
import { formatCountDelta } from "@/lib/tfl/observatory/census"
import type {
  CensusId,
  DatasetId,
  ObservatoryPageData,
  ObservatoryPageSubject,
  ObservatoryState,
} from "@/lib/tfl/observatory/types"
import { cn } from "@/lib/utils"

type DisplayState = ObservatoryState | "unknown" | "observed"

const STATE_ICON: Record<DisplayState, LucideIcon> = {
  current: CircleCheck,
  suspect: TriangleAlert,
  changed: GitCompare,
  incomplete: CircleDashed,
  unavailable: CloudOff,
  unknown: CircleHelp,
  observed: CircleCheck,
}

const STATE_ICON_CLASS: Record<DisplayState, string> = {
  current: "text-emerald-600 dark:text-emerald-400",
  suspect: "text-amber-600 dark:text-amber-400",
  changed: "text-sky-600 dark:text-sky-400",
  incomplete: "text-rose-600 dark:text-rose-400",
  unavailable: "text-rose-600 dark:text-rose-400",
  unknown: "text-muted-foreground",
  observed: "text-emerald-600 dark:text-emerald-400",
}

const STATE_BADGE_CLASS: Record<DisplayState, string> = {
  current: "bg-emerald-500/10",
  suspect: "bg-amber-500/10",
  changed: "bg-sky-500/10",
  incomplete: "bg-rose-500/10",
  unavailable: "bg-rose-500/10",
  unknown: "",
  observed: "bg-emerald-500/10",
}

const DATASET_ICON: Record<DatasetId, LucideIcon> = {
  lines: Waypoints,
  stops: MapPin,
  routes: Route,
}

const CENSUS_ICON: Record<CensusId, LucideIcon> = {
  "bus-lines": Bus,
  "bus-points": MapPin,
  "bike-points": Bike,
}

const STATE_ORDER: ObservatoryState[] = [
  "current",
  "suspect",
  "changed",
  "incomplete",
  "unavailable",
]

const displayStateHint = (state: DisplayState): string | undefined => {
  if (state === "unknown") return undefined
  return observatoryStateHint(state)
}

const StateBadge = ({ state }: { state: DisplayState }) => {
  const Icon = STATE_ICON[state]
  const hint = displayStateHint(state)
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "overflow-visible px-1 text-muted-foreground",
        STATE_BADGE_CLASS[state]
      )}
    >
      <Icon
        data-icon="inline-start"
        className={cn("-ml-0.5 size-3 shrink-0", STATE_ICON_CLASS[state])}
        aria-hidden
      />
      <span className={CHIP_CAP_TEXT_BOX_CLASS}>
        {observatoryStateLabel(state)}
      </span>
    </Badge>
  )

  if (!hint) return badge

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex cursor-help">
          {badge}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        {hint}
      </TooltipContent>
    </Tooltip>
  )
}

const IconBadge = ({
  icon: Icon,
  iconClassName,
  children,
}: {
  icon: LucideIcon
  iconClassName?: string
  children: ReactNode
}) => (
  <Badge
    variant="outline"
    className="overflow-visible px-1 text-muted-foreground"
  >
    <Icon
      data-icon="inline-start"
      className={cn("-ml-0.5 size-3 shrink-0", iconClassName)}
      aria-hidden
    />
    <span className={CHIP_CAP_TEXT_BOX_CLASS}>{children}</span>
  </Badge>
)

const formatCount = (value: number): string =>
  new Intl.NumberFormat("en-GB").format(value)

const DatasetCard = ({
  id,
  title,
  icon: Icon,
  state,
  figure,
  delta,
  children,
}: {
  id: string
  title: string
  icon: LucideIcon
  state: DisplayState
  figure: number | null
  delta?: number | null
  children?: ReactNode
}) => (
  <section
    className="flex flex-col gap-3 rounded-md border border-border bg-background p-4"
    aria-labelledby={`observatory-${id}`}
  >
    <div className="flex items-start justify-between gap-2">
      <h3
        id={`observatory-${id}`}
        className="inline-flex items-center gap-2 text-base font-semibold text-foreground"
      >
        <Icon
          className={cn("size-4 shrink-0", STATE_ICON_CLASS[state])}
          aria-hidden
        />
        {title}
      </h3>
      <StateBadge state={state} />
    </div>
    <p className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
      {figure == null ? "—" : formatCount(figure)}
      {delta != null && delta !== 0 ? (
        <span className="ml-2 text-base font-medium text-muted-foreground">
          {formatCountDelta(delta)}
        </span>
      ) : null}
    </p>
    {children}
  </section>
)

const SubjectRow = ({ subject }: { subject: ObservatoryPageSubject }) => (
  <li className="grid gap-x-3 gap-y-1 border-b border-border py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline">
    <p className="text-foreground">{subject.label}</p>
    <StateBadge state={subject.state} />
    {subject.summary && subject.state !== "current" ? (
      <p className="sm:col-span-2">{subject.summary}</p>
    ) : null}
    {subject.changeDetails.length > 0 ? (
      <ul className="space-y-1 sm:col-span-2">
        {subject.changeDetails.map((detail) => (
          <li key={detail}>{detail}</li>
        ))}
      </ul>
    ) : null}
  </li>
)

const emptyReasonCopy = (reason: ObservatoryPageData["emptyReason"]) =>
  reason === "no-store"
    ? "No observations recorded yet."
    : "No complete observation yet."

export const ObservatoryFallback = () => (
  <DocsReadableWidth>
    <article className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="tfl-title text-3xl text-foreground">TfL metadata</h1>
          <p className="mt-2 max-w-prose text-lg text-muted-foreground">
            Independent observation of TfL line, stop, and route metadata.
          </p>
        </div>
        <IconBadge icon={Clock}>Loading observations</IconBadge>
      </header>
    </article>
  </DocsReadableWidth>
)

export const ObservatoryView = ({ data }: { data: ObservatoryPageData }) => {
  const sameObservationTime =
    Boolean(data.latestCompleteAt) &&
    Boolean(data.updatedAt) &&
    data.latestCompleteAt === data.updatedAt

  return (
    <DocsReadableWidth>
      <article className="space-y-8 text-sm text-muted-foreground">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="min-w-0">
            <h1 className="tfl-title text-3xl text-foreground">TfL metadata</h1>
            <p className="mt-2 max-w-prose text-lg text-muted-foreground">
              Independent observation of TfL line, stop, and route metadata.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:max-w-md sm:justify-end">
            <StateBadge state={data.overallState} />
            {sameObservationTime ? (
              <IconBadge
                icon={CalendarCheck}
                iconClassName={STATE_ICON_CLASS[data.overallState]}
              >
                <ObservationTime
                  iso={data.latestCompleteAt}
                  fallback="none yet"
                />
              </IconBadge>
            ) : (
              <>
                <IconBadge icon={CalendarCheck}>
                  <span className="sr-only">Latest complete observation </span>
                  <ObservationTime
                    iso={data.latestCompleteAt}
                    fallback="none yet"
                  />
                </IconBadge>
                {data.updatedAt ? (
                  <IconBadge icon={RefreshCw}>
                    <span className="sr-only">Last run </span>
                    <ObservationTime iso={data.updatedAt} fallback="unknown" />
                  </IconBadge>
                ) : null}
              </>
            )}
          </div>
        </header>

        {data.overallState === "unknown" ? (
          <p>{emptyReasonCopy(data.emptyReason)}</p>
        ) : data.overallState !== "current" ? (
          <p className="max-w-prose">
            {observatoryStateHint(data.overallState)}
          </p>
        ) : null}

        {data.attention.length > 0 ? (
          <section
            className="space-y-2"
            aria-labelledby="observatory-attention"
          >
            <h2
              id="observatory-attention"
              className="text-lg font-semibold text-foreground"
            >
              Needs attention
            </h2>
            <ul>
              {data.attention.map((subject) => (
                <SubjectRow key={subject.id} subject={subject} />
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-label="Watched datasets">
          <div className="grid gap-3 sm:grid-cols-3">
            {data.datasets.map((dataset) => {
              const flagged = dataset.subjects.filter(
                (subject) => subject.state !== "current"
              )
              return (
                <DatasetCard
                  key={dataset.id}
                  id={dataset.id}
                  title={dataset.title}
                  icon={DATASET_ICON[dataset.id]}
                  state={dataset.state}
                  figure={dataset.itemCount}
                  delta={dataset.delta}
                >
                  {flagged.length > 0 ? (
                    <ul>
                      {flagged.map((subject) => (
                        <SubjectRow key={subject.id} subject={subject} />
                      ))}
                    </ul>
                  ) : null}
                </DatasetCard>
              )
            })}
            {data.census.map((row) => (
              <DatasetCard
                key={row.id}
                id={row.id}
                title={row.title}
                icon={CENSUS_ICON[row.id]}
                state={row.state}
                figure={row.observedCount ?? row.baselineCount}
                delta={row.delta}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="observatory-states">
          <details className="group">
            <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 marker:content-none [&::-webkit-details-marker]:hidden">
              <h2
                id="observatory-states"
                className="text-lg font-semibold text-foreground"
              >
                States
              </h2>
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {STATE_ORDER.map((state) => (
                <div
                  key={state}
                  className="grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-0.5"
                >
                  <dt>
                    <StateBadge state={state} />
                  </dt>
                  <dd>{observatoryStateHint(state)}</dd>
                </div>
              ))}
            </dl>
          </details>
        </section>

        <section className="space-y-3" aria-labelledby="observatory-history">
          <h2
            id="observatory-history"
            className="text-lg font-semibold text-foreground"
          >
            History
          </h2>
          {data.history.length === 0 ? (
            <p>No observation history yet.</p>
          ) : (
            <>
              <ObservationChart events={data.history} />
              <ObservationHistory events={data.history} />
            </>
          )}
        </section>
      </article>
    </DocsReadableWidth>
  )
}
