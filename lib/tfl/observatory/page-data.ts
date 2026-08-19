import type {
  DatasetId,
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
    description: "Stations and piers that belong to those lines.",
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

export const toObservatoryPageData = (
  store: ObservatoryStore | null
): ObservatoryPageData => {
  if (!store) {
    return {
      overallState: "unknown",
      latestCompleteAt: null,
      updatedAt: null,
      datasets: DATASETS.map((dataset) => ({
        id: dataset.id,
        title: dataset.title,
        description: dataset.description,
        state: "unknown",
        subjectCount: 0,
        attentionCount: 0,
        subjects: [],
      })),
      attention: [],
      history: [],
      emptyReason: "no-store",
    }
  }

  const subjects = Object.values(store.subjects)
  if (subjects.length === 0) {
    return {
      overallState: "unknown",
      latestCompleteAt: store.latestCompleteAt,
      updatedAt: store.updatedAt,
      datasets: DATASETS.map((dataset) => ({
        id: dataset.id,
        title: dataset.title,
        description: dataset.description,
        state: "unknown",
        subjectCount: 0,
        attentionCount: 0,
        subjects: [],
      })),
      attention: [],
      history: store.history,
      emptyReason: "no-observations",
    }
  }

  const datasets: ObservatoryPageDataset[] = DATASETS.map((dataset) => {
    const rows = subjects
      .filter(dataset.match)
      .map(toPageSubject)
      .sort(compareSubjects)
    const attentionCount = rows.filter((row) => row.state !== "current").length
    return {
      id: dataset.id,
      title: dataset.title,
      description: dataset.description,
      state: worstState(rows.map((row) => row.state)),
      subjectCount: rows.length,
      attentionCount,
      subjects: rows,
    }
  })

  const attention = datasets
    .flatMap((dataset) => dataset.subjects)
    .filter((subject) => subject.state !== "current")
    .sort(compareSubjects)

  return {
    overallState: worstState(datasets.map((dataset) => dataset.state)),
    latestCompleteAt: store.latestCompleteAt,
    updatedAt: store.updatedAt,
    datasets,
    attention,
    history: store.history,
    emptyReason: null,
  }
}
