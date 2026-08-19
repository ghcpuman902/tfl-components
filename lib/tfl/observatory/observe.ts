import {
  assessObservation,
  confirmAssessments,
} from "@/lib/tfl/observatory/assess"
import type { AssessResult } from "@/lib/tfl/observatory/assess"
import { selectNewObservatoryAlerts } from "@/lib/tfl/observatory/email"
import type { MetadataFetcher } from "@/lib/tfl/observatory/fetch"
import { itemCount } from "@/lib/tfl/observatory/hash"
import {
  FETCH_CONCURRENCY,
  LINE_CATALOGUE_SUBJECT_ID,
  OBSERVED_MODES,
  formatLineLabel,
  routeSequenceSubjectId,
  stopPointsSubjectId,
} from "@/lib/tfl/observatory/inventory"
import {
  cataloguePayload,
  normaliseLines,
  normaliseRouteSequence,
  normaliseStops,
  routePayload,
  stopsPayload,
} from "@/lib/tfl/observatory/normalise"
import { mapPool } from "@/lib/tfl/observatory/pool"
import {
  emptyObservatoryStore,
  prependHistory,
  type ObservatoryRepository,
} from "@/lib/tfl/observatory/store"
import type {
  CanonicalPayload,
  ObservatoryDirection,
  ObservatoryHistoryEvent,
  ObservatoryPassResult,
  ObservatoryRunKind,
  ObservatoryStore,
  ObservatorySubject,
  ObservatorySubjectKind,
  RawRouteSequence,
  RawStopPoint,
} from "@/lib/tfl/observatory/types"
import { OBSERVATORY_DIRECTIONS } from "@/lib/tfl/observatory/types"

type LineRef = {
  id: string
  name: string
  modeName: string
}

type ObservedValue = {
  payload: CanonicalPayload | null
  rawCount: number
  validCount: number
  failure?: "error"
  error?: string
}

type SubjectWork = {
  id: string
  kind: ObservatorySubjectKind
  label: string
  lineId?: string
  lineName?: string
  modeName?: string
  direction?: ObservatoryDirection
}

const isoFromMs = (nowMs: number): string => new Date(nowMs).toISOString()

const needsConfirmation = (result: AssessResult): boolean =>
  result.state !== "current"

const lineRefsFromPayload = (payload: CanonicalPayload | null): LineRef[] => {
  if (!payload || payload.kind !== "line-catalogue") return []
  return payload.lines.map((line) => ({
    id: line.id,
    name: line.name,
    modeName: line.modeName,
  }))
}

const lineRefsFromStore = (store: ObservatoryStore): LineRef[] => {
  const fromCatalogue = lineRefsFromPayload(
    store.subjects[LINE_CATALOGUE_SUBJECT_ID]?.baseline?.canonical ?? null
  )
  const extra: LineRef[] = []
  for (const subject of Object.values(store.subjects)) {
    if (!subject.lineId) continue
    extra.push({
      id: subject.lineId,
      name: subject.lineName ?? subject.lineId,
      modeName: subject.modeName ?? "",
    })
  }
  const byId = new Map<string, LineRef>()
  for (const line of [...fromCatalogue, ...extra]) {
    if (!byId.has(line.id)) byId.set(line.id, line)
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, "en"))
}

const mergeLineRefs = (...groups: LineRef[][]): LineRef[] => {
  const byId = new Map<string, LineRef>()
  for (const group of groups) {
    for (const line of group) {
      const existing = byId.get(line.id)
      if (!existing || (line.name && line.name !== line.id))
        byId.set(line.id, line)
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, "en"))
}

const readCatalogue = async (
  fetcher: MetadataFetcher
): Promise<ObservedValue> => {
  try {
    const raw = await fetcher.getLinesByModes(OBSERVED_MODES)
    const normalised = normaliseLines(raw)
    return {
      payload: cataloguePayload(normalised.lines),
      rawCount: normalised.rawCount,
      validCount: normalised.lines.length,
    }
  } catch (err) {
    return {
      payload: null,
      rawCount: 0,
      validCount: 0,
      failure: "error",
      error:
        err instanceof Error ? err.message : "Line catalogue request failed",
    }
  }
}

const readStops = async (
  fetcher: MetadataFetcher,
  lineId: string
): Promise<ObservedValue> => {
  try {
    const raw: RawStopPoint[] = await fetcher.getStopPoints(lineId)
    const normalised = normaliseStops(lineId, raw)
    return {
      payload: stopsPayload(lineId, normalised.stops),
      rawCount: normalised.rawCount,
      validCount: normalised.stops.length,
    }
  } catch (err) {
    return {
      payload: null,
      rawCount: 0,
      validCount: 0,
      failure: "error",
      error: err instanceof Error ? err.message : "Stop points request failed",
    }
  }
}

const readRoute = async (
  fetcher: MetadataFetcher,
  lineId: string,
  direction: ObservatoryDirection
): Promise<ObservedValue> => {
  try {
    const raw: RawRouteSequence = await fetcher.getRouteSequence(
      lineId,
      direction
    )
    const normalised = normaliseRouteSequence(lineId, direction, raw)
    const payload = routePayload(normalised.route)
    return {
      payload,
      rawCount: normalised.rawBranchCount,
      validCount: itemCount(payload),
    }
  } catch (err) {
    return {
      payload: null,
      rawCount: 0,
      validCount: 0,
      failure: "error",
      error:
        err instanceof Error ? err.message : "Route sequence request failed",
    }
  }
}

const assessObserved = (
  subject: ObservatorySubject | undefined,
  work: SubjectWork,
  observed: ObservedValue
): AssessResult =>
  assessObservation({
    baseline: subject?.baseline?.canonical ?? null,
    observed: observed.payload,
    failure: observed.failure,
    rawCount: observed.rawCount,
    validCount: observed.validCount,
    context: {
      lineId: work.lineId,
      lineName: work.lineName,
      modeName: work.modeName,
    },
  })

const applyResult = (
  existing: ObservatorySubject | undefined,
  work: SubjectWork,
  result: AssessResult,
  payload: CanonicalPayload | null,
  at: string,
  kind: ObservatoryRunKind
): ObservatorySubject => {
  const baseline =
    result.shouldUpdateBaseline && payload && result.hash
      ? {
          hash: result.hash,
          observedAt: at,
          canonical: payload,
          itemCount: result.itemCount ?? 0,
        }
      : (existing?.baseline ?? null)

  const pendingSuspect =
    result.state === "suspect" && payload && result.hash
      ? {
          hash: result.hash,
          canonical: payload,
          firstSeenAt: existing?.pendingSuspect?.firstSeenAt ?? at,
          summary: result.summary,
          details: result.details,
        }
      : undefined

  const lastChange =
    result.state === "changed"
      ? { at, summary: result.summary, details: result.details }
      : existing?.lastChange

  return {
    id: work.id,
    kind: work.kind,
    label: work.label,
    lineId: work.lineId,
    lineName: work.lineName,
    modeName: work.modeName,
    direction: work.direction,
    state: result.state,
    baseline,
    lastObservation: {
      at,
      kind,
      state: result.state,
      hash: result.hash,
      itemCount: result.itemCount,
      summary: result.summary,
    },
    lastChange,
    pendingSuspect,
  }
}

const historyEvent = (
  at: string,
  kind: ObservatoryRunKind,
  subject: ObservatorySubject | null,
  summary: string,
  details: string[],
  state: ObservatoryHistoryEvent["state"]
): ObservatoryHistoryEvent => ({
  id: subject
    ? `${kind}:${subject.id}:${at}:${state}`
    : `${kind}:run:${at}:${state}`,
  at,
  kind,
  subjectId: subject?.id ?? null,
  subjectLabel: subject?.label ?? "Observation run",
  state,
  summary,
  details,
})

const catalogueWork = (): SubjectWork => ({
  id: LINE_CATALOGUE_SUBJECT_ID,
  kind: "line-catalogue",
  label: "Line catalogue",
})

const stopWork = (line: LineRef): SubjectWork => ({
  id: stopPointsSubjectId(line.id),
  kind: "stop-points",
  label: `${formatLineLabel(line.name, line.id, line.modeName)} stop points`,
  lineId: line.id,
  lineName: line.name,
  modeName: line.modeName,
})

const routeWork = (
  line: LineRef,
  direction: ObservatoryDirection
): SubjectWork => ({
  id: routeSequenceSubjectId(line.id, direction),
  kind: "route-sequence",
  label: `${formatLineLabel(line.name, line.id, line.modeName)} ${direction} route`,
  lineId: line.id,
  lineName: line.name,
  modeName: line.modeName,
  direction,
})

const readSubject = async (
  fetcher: MetadataFetcher,
  work: SubjectWork
): Promise<ObservedValue> => {
  if (work.kind === "line-catalogue") return readCatalogue(fetcher)
  if (work.kind === "stop-points" && work.lineId) {
    return readStops(fetcher, work.lineId)
  }
  if (work.kind === "route-sequence" && work.lineId && work.direction) {
    return readRoute(fetcher, work.lineId, work.direction)
  }
  return { payload: null, rawCount: 0, validCount: 0, failure: "error" }
}

export const runObservatoryPass = async ({
  fetcher,
  store,
  nowMs,
  notify,
}: {
  fetcher: MetadataFetcher
  store: ObservatoryRepository
  nowMs: number
  notify?: (events: ObservatoryHistoryEvent[]) => Promise<void>
}): Promise<ObservatoryPassResult> => {
  const locked = await store.acquireLock()
  if (!locked) {
    const existing =
      (await store.load()) ?? emptyObservatoryStore(isoFromMs(nowMs))
    return { ran: false, skipped: "lock", store: existing, notableEvents: [] }
  }

  try {
    const at = isoFromMs(nowMs)
    const loaded = (await store.load()) ?? emptyObservatoryStore(at)
    const subjects = { ...loaded.subjects }
    const events: ObservatoryHistoryEvent[] = []

    const catalogueObserved = await readCatalogue(fetcher)
    const catalogueFirst = assessObserved(
      subjects[LINE_CATALOGUE_SUBJECT_ID],
      catalogueWork(),
      catalogueObserved
    )

    let catalogueResult = catalogueFirst
    let cataloguePayloadValue = catalogueObserved.payload
    let catalogueKind: ObservatoryRunKind = "scheduled"

    if (needsConfirmation(catalogueFirst)) {
      const confirmed = await readCatalogue(fetcher)
      const second = assessObserved(
        subjects[LINE_CATALOGUE_SUBJECT_ID],
        catalogueWork(),
        confirmed
      )
      catalogueResult = confirmAssessments(
        catalogueFirst,
        second,
        confirmed.payload
      )
      cataloguePayloadValue = confirmed.payload
      catalogueKind = "confirmation"
    }

    subjects[LINE_CATALOGUE_SUBJECT_ID] = applyResult(
      subjects[LINE_CATALOGUE_SUBJECT_ID],
      catalogueWork(),
      catalogueResult,
      cataloguePayloadValue,
      at,
      catalogueKind
    )

    if (catalogueResult.state !== "current") {
      events.push(
        historyEvent(
          at,
          catalogueKind,
          subjects[LINE_CATALOGUE_SUBJECT_ID]!,
          catalogueResult.summary,
          catalogueResult.details,
          catalogueResult.state
        )
      )
    }

    const observedLines = lineRefsFromPayload(cataloguePayloadValue)
    const lines = mergeLineRefs(
      observedLines,
      lineRefsFromStore({ ...loaded, subjects })
    )

    const lineWork: SubjectWork[] = lines.flatMap((line) => [
      stopWork(line),
      ...OBSERVATORY_DIRECTIONS.map((direction) => routeWork(line, direction)),
    ])

    const firstPass = await mapPool(
      lineWork,
      FETCH_CONCURRENCY,
      async (work) => {
        const observed = await readSubject(fetcher, work)
        const first = assessObserved(subjects[work.id], work, observed)
        return { work, observed, first }
      }
    )

    const toConfirm = firstPass.filter((item) => needsConfirmation(item.first))
    const confirmations = await mapPool(
      toConfirm,
      FETCH_CONCURRENCY,
      async (item) => {
        const observed = await readSubject(fetcher, item.work)
        const second = assessObserved(
          subjects[item.work.id],
          item.work,
          observed
        )
        return { id: item.work.id, observed, second }
      }
    )
    const confirmationById = new Map(
      confirmations.map((item) => [item.id, item])
    )

    let completeSubjects = 0
    let attentionSubjects = 0

    for (const item of firstPass) {
      const confirmation = confirmationById.get(item.work.id)
      const result = confirmation
        ? confirmAssessments(
            item.first,
            confirmation.second,
            confirmation.observed.payload
          )
        : item.first
      const payload = confirmation
        ? confirmation.observed.payload
        : item.observed.payload
      const kind: ObservatoryRunKind = confirmation
        ? "confirmation"
        : "scheduled"

      subjects[item.work.id] = applyResult(
        subjects[item.work.id],
        item.work,
        result,
        payload,
        at,
        kind
      )

      if (
        result.state === "current" ||
        result.state === "changed" ||
        result.state === "suspect"
      ) {
        completeSubjects += 1
      }
      if (result.state !== "current") {
        attentionSubjects += 1
        events.push(
          historyEvent(
            at,
            kind,
            subjects[item.work.id]!,
            result.summary,
            result.details,
            result.state
          )
        )
      }
    }

    const catalogueComplete =
      catalogueResult.state === "current" ||
      catalogueResult.state === "changed" ||
      catalogueResult.state === "suspect"
    if (catalogueComplete) completeSubjects += 1
    if (catalogueResult.state !== "current") attentionSubjects += 1

    const attempted = lineWork.length + 1
    const runWasComplete = completeSubjects === attempted
    const runSummary =
      attentionSubjects === 0
        ? "Observation completed. No metadata change."
        : `Observation completed. ${attentionSubjects} ${
            attentionSubjects === 1 ? "dataset needs" : "datasets need"
          } attention.`

    events.unshift(
      historyEvent(at, "scheduled", null, runSummary, [], "observed")
    )

    const notableEvents = events.filter(
      (event) =>
        event.state === "changed" ||
        event.state === "incomplete" ||
        event.state === "unavailable"
    )
    const { toSend, nextNotified } = selectNewObservatoryAlerts(
      notableEvents,
      loaded.lastNotified,
      at
    )

    const nextStore: ObservatoryStore = prependHistory(
      {
        version: 1,
        updatedAt: at,
        latestCompleteAt: runWasComplete ? at : loaded.latestCompleteAt,
        subjects,
        history: loaded.history,
        lastNotified: nextNotified,
      },
      events
    )

    await store.save(nextStore)

    if (notify && toSend.length > 0) {
      try {
        await notify(toSend)
      } catch (err) {
        console.error("[observatory] notify failed", err)
      }
    }

    return { ran: true, store: nextStore, notableEvents: toSend }
  } finally {
    await store.releaseLock()
  }
}

export type { LineRef }
