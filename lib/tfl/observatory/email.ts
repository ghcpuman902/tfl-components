import { Resend } from "resend"
import { FEEDBACK_FROM, FEEDBACK_TO } from "@/lib/feedback/constants"
import { escapeHtml } from "@/lib/feedback/email"
import { SITE_URL } from "@/lib/site"
import { observatoryStateLabel } from "@/lib/tfl/observatory/format"
import type {
  ObservatoryHistoryEvent,
  ObservatoryStore,
} from "@/lib/tfl/observatory/types"

export const observatoryNotifyFingerprint = (
  event: ObservatoryHistoryEvent
): string => `${event.subjectId ?? "run"}:${event.state}:${event.summary}`

export const selectNewObservatoryAlerts = (
  events: readonly ObservatoryHistoryEvent[],
  lastNotified: ObservatoryStore["lastNotified"],
  nowIso: string
): {
  toSend: ObservatoryHistoryEvent[]
  nextNotified: ObservatoryStore["lastNotified"]
} => {
  const nextNotified = { ...lastNotified }
  const toSend: ObservatoryHistoryEvent[] = []

  for (const event of events) {
    if (
      event.state !== "changed" &&
      event.state !== "incomplete" &&
      event.state !== "unavailable"
    ) {
      continue
    }
    const key = event.subjectId ?? "run"
    const fingerprint = observatoryNotifyFingerprint(event)
    if (lastNotified[key]?.fingerprint === fingerprint) continue
    toSend.push(event)
    nextNotified[key] = {
      state: event.state,
      fingerprint,
      at: nowIso,
    }
  }

  return { toSend, nextNotified }
}

export const buildObservatoryAlertText = (
  events: readonly ObservatoryHistoryEvent[]
): string => {
  const lines = [
    "TfL metadata observatory",
    SITE_URL + "/observatory",
    "",
    ...events.flatMap((event) => [
      `${observatoryStateLabel(event.state)} — ${event.subjectLabel}`,
      event.summary,
      ...event.details,
      "",
    ]),
  ]
  return lines.join("\n").trim()
}

export const buildObservatoryAlertHtml = (
  events: readonly ObservatoryHistoryEvent[]
): string => {
  const items = events
    .map((event) => {
      const details =
        event.details.length > 0
          ? `<ul>${event.details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}</ul>`
          : ""
      return `<li><p><strong>${escapeHtml(observatoryStateLabel(event.state))}</strong> — ${escapeHtml(event.subjectLabel)}</p><p>${escapeHtml(event.summary)}</p>${details}</li>`
    })
    .join("")

  return `<p>TfL metadata observatory recorded a confirmed change or a TfL response problem.</p><p><a href="${SITE_URL}/observatory">${SITE_URL}/observatory</a></p><ul>${items}</ul>`
}

export const sendObservatoryAlerts = async (
  events: readonly ObservatoryHistoryEvent[]
): Promise<void> => {
  if (events.length === 0) return
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const from = process.env.FEEDBACK_FROM ?? FEEDBACK_FROM
  const to = process.env.FEEDBACK_TO ?? FEEDBACK_TO
  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject:
      events.length === 1
        ? `TfL metadata: ${events[0]!.subjectLabel} ${observatoryStateLabel(events[0]!.state).toLowerCase()}`
        : `TfL metadata: ${events.length} observations need attention`,
    text: buildObservatoryAlertText(events),
    html: buildObservatoryAlertHtml(events),
    tags: [{ name: "category", value: "tfl-metadata-observatory" }],
  })

  if (error) {
    throw new Error(error.message)
  }
}
