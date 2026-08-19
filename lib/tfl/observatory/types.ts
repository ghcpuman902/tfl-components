/** Product states for one observed metadata subject. */
export const OBSERVATORY_STATES = [
  "current",
  "suspect",
  "changed",
  "incomplete",
  "unavailable",
] as const

export type ObservatoryState = (typeof OBSERVATORY_STATES)[number]

export const OBSERVATORY_DIRECTIONS = ["inbound", "outbound"] as const
export type ObservatoryDirection = (typeof OBSERVATORY_DIRECTIONS)[number]

export type ObservatorySubjectKind =
  "line-catalogue" | "stop-points" | "route-sequence"

export type ObservatoryRunKind = "scheduled" | "confirmation"

export type CanonicalLine = {
  id: string
  name: string
  modeName: string
  serviceTypes: string[]
}

export type CanonicalStop = {
  id: string
  name: string
}

export type CanonicalLineStops = {
  lineId: string
  stops: CanonicalStop[]
}

export type CanonicalRouteBranch = {
  name: string
  serviceType: string
  naptanIds: string[]
}

export type CanonicalRouteSequence = {
  lineId: string
  direction: ObservatoryDirection
  branches: CanonicalRouteBranch[]
}

export type CanonicalPayload =
  | { kind: "line-catalogue"; lines: CanonicalLine[] }
  | { kind: "stop-points"; lineId: string; stops: CanonicalStop[] }
  | {
      kind: "route-sequence"
      lineId: string
      direction: ObservatoryDirection
      branches: CanonicalRouteBranch[]
    }

export type FetchFailureReason = "error" | "empty" | "malformed" | "incomplete"

export type FetchSuccess<T> = {
  ok: true
  value: T
}

export type FetchFailure = {
  ok: false
  reason: FetchFailureReason
  error?: string
  rawCount?: number
  validCount?: number
}

export type FetchResult<T> = FetchSuccess<T> | FetchFailure

export type RawLine = {
  id?: string | null
  name?: string | null
  modeName?: string | null
  serviceTypes?: { name?: string | null }[] | null
}

export type RawStopPoint = {
  id?: string | null
  naptanId?: string | null
  commonName?: string | null
  name?: string | null
}

export type RawOrderedRoute = {
  name?: string | null
  serviceType?: string | null
  naptanIds?: (string | null | undefined)[] | null
}

export type RawStopPointSequence = {
  stopPoint?: RawStopPoint[] | null
}

export type RawRouteSequence = {
  lineId?: string | null
  lineName?: string | null
  direction?: string | null
  orderedLineRoutes?: RawOrderedRoute[] | null
  stopPointSequences?: RawStopPointSequence[] | null
}

export type SubjectBaseline = {
  hash: string
  observedAt: string
  canonical: CanonicalPayload
  itemCount: number
}

export type SubjectObservation = {
  at: string
  kind: ObservatoryRunKind
  state: ObservatoryState
  hash: string | null
  itemCount: number | null
  summary: string
}

export type SubjectLastChange = {
  at: string
  summary: string
  details: string[]
}

export type ObservatorySubject = {
  id: string
  kind: ObservatorySubjectKind
  label: string
  lineId?: string
  lineName?: string
  modeName?: string
  direction?: ObservatoryDirection
  state: ObservatoryState
  baseline: SubjectBaseline | null
  lastObservation: SubjectObservation | null
  lastChange?: SubjectLastChange
  pendingSuspect?: {
    hash: string
    canonical: CanonicalPayload
    firstSeenAt: string
    summary: string
    details: string[]
  }
}

export type ObservatoryHistoryEvent = {
  id: string
  at: string
  kind: ObservatoryRunKind
  subjectId: string | null
  subjectLabel: string
  state: ObservatoryState | "observed"
  summary: string
  details: string[]
}

export type ObservatoryStore = {
  version: 1
  updatedAt: string
  latestCompleteAt: string | null
  subjects: Record<string, ObservatorySubject>
  history: ObservatoryHistoryEvent[]
  lastNotified: Record<
    string,
    { state: ObservatoryState; fingerprint: string; at: string }
  >
}

export type DatasetId = "lines" | "stops" | "routes"

export type ObservatoryPageSubject = {
  id: string
  label: string
  lineId?: string
  lineName?: string
  modeName?: string
  direction?: ObservatoryDirection
  state: ObservatoryState
  itemCount: number | null
  summary: string | null
  changeDetails: string[]
}

export type ObservatoryPageDataset = {
  id: DatasetId
  title: string
  description: string
  state: ObservatoryState | "unknown"
  subjectCount: number
  attentionCount: number
  subjects: ObservatoryPageSubject[]
}

export type ObservatoryPageData = {
  overallState: ObservatoryState | "unknown"
  latestCompleteAt: string | null
  updatedAt: string | null
  datasets: ObservatoryPageDataset[]
  attention: ObservatoryPageSubject[]
  history: ObservatoryHistoryEvent[]
  emptyReason: "no-store" | "no-observations" | null
}

export type ObservatoryPassResult = {
  ran: boolean
  skipped?: "lock"
  store: ObservatoryStore
  notableEvents: ObservatoryHistoryEvent[]
}
