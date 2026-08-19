import { formatLineLabel } from "@/lib/tfl/observatory/inventory"
import type {
  CanonicalLine,
  CanonicalPayload,
  CanonicalRouteBranch,
  CanonicalStop,
} from "@/lib/tfl/observatory/types"

const plural = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? "" : "s"}`

const linePhrase = (
  name: string | undefined,
  lineId: string,
  modeName?: string
): string => formatLineLabel(name, lineId, modeName)

const indexById = <T extends { id: string }>(
  items: readonly T[]
): Map<string, T> => new Map(items.map((item) => [item.id, item]))

const addedRemovedRenamed = (
  previous: ReadonlyMap<string, { name: string }>,
  next: ReadonlyMap<string, { name: string }>
): { added: string[]; removed: string[]; renamed: string[] } => {
  const added: string[] = []
  const removed: string[] = []
  const renamed: string[] = []

  for (const [id, item] of next) {
    const before = previous.get(id)
    if (!before) {
      added.push(item.name)
      continue
    }
    if (before.name !== item.name) {
      renamed.push(`${before.name} → ${item.name}`)
    }
  }
  for (const [id, item] of previous) {
    if (!next.has(id)) removed.push(item.name)
  }

  added.sort((a, b) => a.localeCompare(b, "en"))
  removed.sort((a, b) => a.localeCompare(b, "en"))
  renamed.sort((a, b) => a.localeCompare(b, "en"))
  return { added, removed, renamed }
}

const summariseMembership = (
  added: string[],
  removed: string[],
  renamed: string[],
  noun: string,
  scope: string
): { summary: string; details: string[] } => {
  const parts: string[] = []
  const details: string[] = []

  if (added.length > 0) {
    parts.push(`${plural(added.length, noun)} added`)
    details.push(
      `${plural(added.length, noun)} added${scope}: ${added.join(", ")}.`
    )
  }
  if (removed.length > 0) {
    parts.push(`${plural(removed.length, noun)} removed`)
    details.push(
      `${plural(removed.length, noun)} removed${scope}: ${removed.join(", ")}.`
    )
  }
  if (renamed.length > 0) {
    parts.push(`${plural(renamed.length, noun)} renamed`)
    details.push(
      `${plural(renamed.length, noun)} renamed${scope}: ${renamed.join("; ")}.`
    )
  }

  const summary =
    parts.length > 0
      ? `${parts.join("; ")}${scope}.`
      : `Metadata changed${scope}.`
  return { summary, details }
}

const branchKey = (branch: CanonicalRouteBranch): string =>
  branch.name || branch.naptanIds.join(",") || "(unnamed)"

const diffBranches = (
  previous: readonly CanonicalRouteBranch[],
  next: readonly CanonicalRouteBranch[],
  scope: string
): { summary: string; details: string[] } => {
  const prevByKey = new Map(
    previous.map((branch) => [branchKey(branch), branch])
  )
  const nextByKey = new Map(next.map((branch) => [branchKey(branch), branch]))
  const details: string[] = []
  let added = 0
  let removed = 0
  let reordered = 0
  let membership = 0

  for (const [key, branch] of nextByKey) {
    if (!prevByKey.has(key)) {
      added += 1
      details.push(
        `Branch added${scope}: ${key} (${plural(branch.naptanIds.length, "station")}).`
      )
    }
  }
  for (const [key, branch] of prevByKey) {
    if (!nextByKey.has(key)) {
      removed += 1
      details.push(
        `Branch removed${scope}: ${key} (${plural(branch.naptanIds.length, "station")}).`
      )
    }
  }

  for (const [key, before] of prevByKey) {
    const after = nextByKey.get(key)
    if (!after) continue
    const beforeIds = before.naptanIds.join(",")
    const afterIds = after.naptanIds.join(",")
    if (beforeIds === afterIds) continue
    const beforeSet = new Set(before.naptanIds)
    const afterSet = new Set(after.naptanIds)
    const sameMembers =
      before.naptanIds.length === after.naptanIds.length &&
      before.naptanIds.every((id) => afterSet.has(id)) &&
      after.naptanIds.every((id) => beforeSet.has(id))
    if (sameMembers) {
      reordered += 1
      details.push(`Station order changed on branch ${key}${scope}.`)
    } else {
      membership += 1
      details.push(`Stations changed on branch ${key}${scope}.`)
    }
  }

  const parts: string[] = []
  if (added) parts.push(`${plural(added, "branch")} added`)
  if (removed) parts.push(`${plural(removed, "branch")} removed`)
  if (reordered) parts.push("station order changed")
  if (membership) parts.push("a route or branch changed")
  if (parts.length === 0) parts.push("a route or branch changed")

  return {
    summary: `${parts.join("; ")}${scope}.`,
    details,
  }
}

export const diffCanonical = (
  previous: CanonicalPayload,
  next: CanonicalPayload,
  context: { lineName?: string; modeName?: string } = {}
): { summary: string; details: string[] } => {
  if (previous.kind !== next.kind) {
    return { summary: "Metadata shape changed.", details: [] }
  }

  if (previous.kind === "line-catalogue" && next.kind === "line-catalogue") {
    const { added, removed, renamed } = addedRemovedRenamed(
      indexById(previous.lines),
      indexById(next.lines)
    )
    const modeChanges: string[] = []
    const prevLines = indexById(previous.lines)
    for (const line of next.lines) {
      const before = prevLines.get(line.id)
      if (before && before.modeName !== line.modeName) {
        modeChanges.push(
          `${line.name} mode ${before.modeName} → ${line.modeName}`
        )
      }
    }
    const membership = summariseMembership(added, removed, renamed, "line", "")
    if (modeChanges.length > 0) {
      membership.details.push(`Mode changed: ${modeChanges.join("; ")}.`)
    }
    return membership
  }

  if (previous.kind === "stop-points" && next.kind === "stop-points") {
    const scope = ` on the ${linePhrase(context.lineName, next.lineId, context.modeName)}`
    const { added, removed, renamed } = addedRemovedRenamed(
      indexById(previous.stops),
      indexById(next.stops)
    )
    return summariseMembership(added, removed, renamed, "stop point", scope)
  }

  if (previous.kind === "route-sequence" && next.kind === "route-sequence") {
    const label = linePhrase(context.lineName, next.lineId, context.modeName)
    const scope = ` on the ${label} (${next.direction})`
    return diffBranches(previous.branches, next.branches, scope)
  }

  return { summary: "Metadata changed.", details: [] }
}

export const emptyResponseSummary = (
  kind: CanonicalPayload["kind"],
  context: { lineName?: string; lineId?: string; modeName?: string }
): string => {
  if (kind === "line-catalogue") {
    return "TfL returned no lines for the observed rail modes."
  }
  const label = linePhrase(
    context.lineName,
    context.lineId ?? "line",
    context.modeName
  )
  if (kind === "stop-points") {
    return `TfL returned no stop points for the ${label}.`
  }
  return `TfL returned no route sequence for the ${label}.`
}

export const incompleteSummary = (
  kind: CanonicalPayload["kind"],
  context: { lineName?: string; lineId?: string; modeName?: string }
): string => {
  if (kind === "line-catalogue") {
    return "TfL returned an incomplete line catalogue."
  }
  const label = linePhrase(
    context.lineName,
    context.lineId ?? "line",
    context.modeName
  )
  if (kind === "stop-points") {
    return `TfL returned an incomplete stop-point list for the ${label}.`
  }
  return `TfL returned an incomplete route sequence for the ${label}.`
}

export type DiffableLine = CanonicalLine
export type DiffableStop = CanonicalStop
