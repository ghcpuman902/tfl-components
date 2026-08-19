import {
  CENSUS_IDS,
  CENSUS_LABELS,
  VERIFIED_CENSUS_COUNTS,
  assessCensusCount,
  censusSubjectId,
  isCensusSubjectId,
} from "@/lib/tfl/observatory/census"
import type {
  DatasetId,
  ObservatoryPageCensus,
  ObservatoryPageData,
  ObservatoryPageDataset,
  ObservatoryPageSubject,
  ObservatoryState,
  ObservatoryStore,
  ObservatorySubject,
} from "@/lib/tfl/observatory/types"

const STATE_RANK: Record<ObservatoryState, number> = {
  unavailable: 5,
  incomplete: 4,
  suspect: 3,
  changed: 2,
  current: 1,
}

export const worstState = (
  states: readonly (ObservatoryState | "unknown")[]
): ObservatoryState | "unknown" => {
  let worst: ObservatoryState | "unknown" = "unknown"
  let rank = 0
  for (const state of states) {
    if (state === "unknown") continue
    const next = STATE_RANK[state]
    if (next > rank) {
      worst = state
      rank = next
    }
  }
  return worst
}

const toPageSubject = (
  subject: ObservatorySubject
): ObservatoryPageSubject => ({
  id: subject.id,
  label: subject.label,
  lineId: subject.lineId,
  lineName: subject.lineName,
  modeName: subject.modeName,
  direction: subject.direction,
  state: subject.state,
  itemCount:
    subject.lastObservation?.itemCount ?? subject.baseline?.itemCount ?? null,
  summary:
    subject.state === "current"
      ? (subject.lastObservation?.summary ?? null)
      : (subject.lastObservation?.summary ??
        subject.lastChange?.summary ??
        null),
  changeDetails:
    subject.state === "changed" || subject.state === "suspect"
      ? (subject.lastChange?.details ?? subject.pendingSuspect?.details ?? [])
      : subject.state === "incomplete" || subject.state === "unavailable"
        ? subject.lastObservation
          ? [subject.lastObservation.summary]
          : []
        : [],
})

const DATASETS: {
  id: DatasetId
  title: string
  description: string
  match: (subject: ObservatorySubject) => boolean
}[] = [
  {
    id: "lines",
    title: "Line catalogue",
    description:
      "Identities for Tube, Elizabeth line, DLR, Overground, Tram, and river bus.",
    match: (subject) => subject.kind === "line-catalogue",
  },
  {
    id: "stops",
    title: "Stop points",
    description: "Stations and piers on the watched lines.",
    match: (subject) => subject.kind === "stop-points",
  },
  {
    id: "routes",
    title: "Route sequences",
    description: "Station order and branches, inbound and outbound.",
    match: (subject) => subject.kind === "route-sequence",
  },
]

const compareSubjects = (
  a: ObservatoryPageSubject,
  b: ObservatoryPageSubject
): number => {
  const rank = STATE_RANK[b.state] - STATE_RANK[a.state]
  if (rank !== 0) return rank
  return a.label.localeCompare(b.label, "en")
}

const toPageCensus = (
  store: ObservatoryStore | null
): ObservatoryPageCensus[] =>
  CENSUS_IDS.map((id) => {
    const record = store?.census?.[id]
    const baselineCount =
      record?.baselineCount ?? VERIFIED_CENSUS_COUNTS[id]
    if (!record) {
      return {
        id,
        title: CENSUS_LABELS[id],
        baselineCount,
        observedCount: null,
        delta: null,
        state: "unknown",
        summary: null,
        at: null,
      }
    }

    const assessed = assessCensusCount({
      observed: record.observedCount,
      baseline: baselineCount,
    })

    return {
      id,
      title: CENSUS_LABELS[id],
      baselineCount,
      observedCount: record.observedCount,
      delta: assessed.delta,
      state: assessed.state,
      summary: assessed.summary,
      at: record.at,
    }
  })

const emptyDatasets = (): ObservatoryPageDataset[] =>
  DATASETS.map((dataset) => ({
    id: dataset.id,
    title: dataset.title,
    description: dataset.description,
    state: "unknown",
    subjectCount: 0,
    itemCount: null,
    delta: null,
    attentionCount: 0,
    subjects: [],
  }))

const toPageHistory = (
  store: ObservatoryStore,
  census: ObservatoryPageCensus[]
): ObservatoryStore["history"] =>
  store.history
    .filter(
      (event) =>
        !(isCensusSubjectId(event.subjectId) && event.state === "current")
    )
    .map((event) => {
      if (event.subjectId !== null || event.counts?.length) return event
      if (event.at !== store.updatedAt) return event
      return {
        ...event,
        counts: census.map((row) => ({
          id: row.id,
          label: row.title,
          observedCount: row.observedCount,
          baselineCount: row.baselineCount,
          state: row.state === "unknown" ? "current" : row.state,
        })),
      }
    })

export const toObservatoryPageData = (
  store: ObservatoryStore | null
): ObservatoryPageData => {
  if (!store) {
    return {
      overallState: "unknown",
      latestCompleteAt: null,
      updatedAt: null,
      datasets: emptyDatasets(),
      census: toPageCensus(null),
      attention: [],
      history: [],
      emptyReason: "no-store",
    }
  }

  const subjects = Object.values(store.subjects)
  if (subjects.length === 0) {
    const census = toPageCensus(store)
    return {
      overallState: "unknown",
      latestCompleteAt: store.latestCompleteAt,
      updatedAt: store.updatedAt,
      datasets: emptyDatasets(),
      census,
      attention: [],
      history: toPageHistory(store, census),
      emptyReason: "no-observations",
    }
  }

  const datasets: ObservatoryPageDataset[] = DATASETS.map((dataset) => {
    const rows = subjects
      .filter(dataset.match)
      .map(toPageSubject)
      .sort(compareSubjects)
    const attentionCount = rows.filter((row) => row.state !== "current").length
    const itemTotal = rows.reduce(
      (sum, row) => sum + (row.itemCount ?? 0),
      0
    )
    return {
      id: dataset.id,
      title: dataset.title,
      description: dataset.description,
      state: worstState(rows.map((row) => row.state)),
      subjectCount: rows.length,
      itemCount: rows.length > 0 ? itemTotal : null,
      delta:
        rows.length > 0 && store.previousItemCounts?.[dataset.id] != null
          ? itemTotal - store.previousItemCounts[dataset.id]!
          : null,
      attentionCount,
      subjects: rows,
    }
  })

  const census = toPageCensus(store)
  const censusAttention = census.flatMap((row) => {
    if (row.state !== "incomplete" && row.state !== "unavailable") return []
    return [
      {
        id: censusSubjectId(row.id),
        label: row.title,
        state: row.state,
        itemCount: row.observedCount,
        summary: row.summary,
        changeDetails: row.summary ? [row.summary] : [],
      },
    ]
  })

  const attention = [
    ...datasets
      .flatMap((dataset) => dataset.subjects)
      .filter((subject) => subject.state !== "current"),
    ...censusAttention,
  ].sort(compareSubjects)

  return {
    overallState: worstState([
      ...datasets.map((dataset) => dataset.state),
      ...census.map((row) => row.state),
    ]),
    latestCompleteAt: store.latestCompleteAt,
    updatedAt: store.updatedAt,
    datasets,
    census,
    attention,
    history: toPageHistory(store, census),
    emptyReason: null,
  }
}
