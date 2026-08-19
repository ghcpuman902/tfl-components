import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { SITE_INDEPENDENCE } from "@/lib/site"
import {
  formatObservationTime,
  observatoryStateHint,
  observatoryStateLabel,
} from "@/lib/tfl/observatory/format"
import type {
  ObservatoryPageData,
  ObservatoryPageSubject,
  ObservatoryState,
} from "@/lib/tfl/observatory/types"
import { cn } from "@/lib/utils"

const STATE_CLASS: Record<ObservatoryState | "unknown" | "observed", string> = {
  current: "text-foreground",
  suspect: "text-foreground",
  changed: "text-foreground",
  incomplete: "text-destructive",
  unavailable: "text-destructive",
  unknown: "text-muted-foreground",
  observed: "text-foreground",
}

const StateLabel = ({
  state,
}: {
  state: ObservatoryState | "unknown" | "observed"
}) => (
  <span className={cn("font-medium", STATE_CLASS[state])}>
    {observatoryStateLabel(state)}
  </span>
)

const ObservationTime = ({
  iso,
  fallback,
}: {
  iso: string | null
  fallback: string
}) => {
  const label = formatObservationTime(iso)
  if (!iso || !label) {
    return <span>{fallback}</span>
  }
  return <time dateTime={iso}>{label}</time>
}

const SubjectRow = ({ subject }: { subject: ObservatoryPageSubject }) => (
  <li className="border-b border-border py-3 last:border-b-0">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p className="text-foreground">{subject.label}</p>
      <StateLabel state={subject.state} />
    </div>
    {subject.summary && subject.state !== "current" ? (
      <p className="mt-1">{subject.summary}</p>
    ) : null}
    {subject.changeDetails.length > 0 ? (
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {subject.changeDetails.map((detail) => (
          <li key={detail}>{detail}</li>
        ))}
      </ul>
    ) : null}
  </li>
)

export const ObservatoryFallback = () => (
  <DocsReadableWidth>
    <article className="space-y-8">
      <header>
        <h1 className="tfl-title text-3xl text-foreground">TfL metadata</h1>
        <p className="mt-2 max-w-prose text-lg text-muted-foreground">
          Independent observation of TfL line, stop, and route metadata. Not an
          official TfL status service.
        </p>
      </header>
      <p className="text-sm text-muted-foreground">Loading observations.</p>
    </article>
  </DocsReadableWidth>
)

export const ObservatoryView = ({ data }: { data: ObservatoryPageData }) => (
  <DocsReadableWidth>
    <article className="space-y-10 text-sm text-muted-foreground">
      <header>
        <h1 className="tfl-title text-3xl text-foreground">TfL metadata</h1>
        <p className="mt-2 max-w-prose text-lg text-muted-foreground">
          Independent observation of TfL line, stop, and route metadata. Not an
          official TfL status service.
        </p>
      </header>

      <p className="max-w-prose">{SITE_INDEPENDENCE}</p>

      <p className="max-w-prose">
        This page watches the TfL line catalogue, the stop points on those
        lines, and rail route sequences. An added station is a metadata change.
        An empty or badly incomplete response is a TfL response problem, and the
        previous baseline is kept.
      </p>

      <section className="space-y-3" aria-labelledby="observatory-state">
        <h2
          id="observatory-state"
          className="text-lg font-semibold text-foreground"
        >
          Current observation
        </h2>
        <p>
          State: <StateLabel state={data.overallState} />
        </p>
        <p>
          Latest complete observation:{" "}
          <ObservationTime iso={data.latestCompleteAt} fallback="none yet" />
        </p>
        {data.updatedAt ? (
          <p>
            Last run:{" "}
            <ObservationTime iso={data.updatedAt} fallback="unknown" />
          </p>
        ) : null}
        {data.overallState !== "unknown" ? (
          <p className="max-w-prose">
            {observatoryStateHint(data.overallState)}
          </p>
        ) : (
          <p className="max-w-prose">
            {data.emptyReason === "no-store"
              ? "Observations have not been recorded on this deployment yet."
              : "No complete observation has been recorded yet."}
          </p>
        )}
      </section>

      {data.attention.length > 0 ? (
        <section className="space-y-3" aria-labelledby="observatory-attention">
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

      <section className="space-y-6" aria-labelledby="observatory-datasets">
        <h2
          id="observatory-datasets"
          className="text-lg font-semibold text-foreground"
        >
          Watched datasets
        </h2>
        {data.datasets.map((dataset) => (
          <section
            key={dataset.id}
            className="space-y-2"
            aria-labelledby={`observatory-${dataset.id}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3
                id={`observatory-${dataset.id}`}
                className="font-medium text-foreground"
              >
                {dataset.title}
              </h3>
              <StateLabel state={dataset.state} />
            </div>
            <p>{dataset.description}</p>
            {dataset.subjectCount > 0 ? (
              <p>
                {dataset.subjectCount}{" "}
                {dataset.subjectCount === 1 ? "record" : "records"}
                {dataset.attentionCount > 0
                  ? ` · ${dataset.attentionCount} need attention`
                  : ""}
              </p>
            ) : null}
            {dataset.subjects.some((subject) => subject.state !== "current") ? (
              <ul>
                {dataset.subjects
                  .filter((subject) => subject.state !== "current")
                  .map((subject) => (
                    <SubjectRow key={subject.id} subject={subject} />
                  ))}
              </ul>
            ) : null}
          </section>
        ))}
      </section>

      <section className="space-y-3" aria-labelledby="observatory-states">
        <h2
          id="observatory-states"
          className="text-lg font-semibold text-foreground"
        >
          How to read the states
        </h2>
        <dl className="max-w-prose space-y-2">
          <div>
            <dt className="font-medium text-foreground">Current</dt>
            <dd>{observatoryStateHint("current")}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Suspect</dt>
            <dd>{observatoryStateHint("suspect")}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Changed</dt>
            <dd>{observatoryStateHint("changed")}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Incomplete</dt>
            <dd>{observatoryStateHint("incomplete")}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Unavailable</dt>
            <dd>{observatoryStateHint("unavailable")}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3" aria-labelledby="observatory-history">
        <h2
          id="observatory-history"
          className="text-lg font-semibold text-foreground"
        >
          Observation history
        </h2>
        {data.history.length === 0 ? (
          <p>No observation history yet.</p>
        ) : (
          <ol className="space-y-4">
            {data.history.slice(0, 24).map((event) => (
              <li key={event.id} className="border-b border-border pb-3">
                <p className="text-foreground">
                  <ObservationTime iso={event.at} fallback={event.at} />
                  <span aria-hidden> · </span>
                  {event.subjectLabel}
                  <span aria-hidden> · </span>
                  <StateLabel state={event.state} />
                </p>
                <p className="mt-1">{event.summary}</p>
                {event.details.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {event.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </article>
  </DocsReadableWidth>
)
