import { APP_VERSION_LABEL } from "@/lib/version"
import type { FeedbackFields } from "./schema"
import { kindLabel } from "./schema"

/** Escape text for safe inclusion in HTML email bodies. */
export const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

export const buildFeedbackSubject = (fields: FeedbackFields): string => {
  const kind = kindLabel(fields.kind)
  const path = safePath(fields.pageUrl)
  return `[TfL Components] ${kind}: ${path}`
}

export const buildFeedbackText = (fields: FeedbackFields): string => {
  const lines = [
    `Kind: ${kindLabel(fields.kind)}`,
    `Page: ${fields.pageUrl}`,
    `Title: ${fields.pageTitle || "(none)"}`,
    `App version: ${fields.appVersion || APP_VERSION_LABEL}`,
    `Follow-up email: ${fields.email ?? "(not provided)"}`,
    "",
    "Message:",
    fields.message,
  ]
  return lines.join("\n")
}

export const buildFeedbackHtml = (fields: FeedbackFields): string => {
  const rows: Array<[string, string]> = [
    ["Kind", kindLabel(fields.kind)],
    ["Page", fields.pageUrl],
    ["Title", fields.pageTitle || "(none)"],
    ["App version", fields.appVersion || APP_VERSION_LABEL],
    ["Follow-up email", fields.email ?? "(not provided)"],
  ]

  const meta = rows
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:4px 12px 4px 0;vertical-align:top;color:#555;">${escapeHtml(label)}</th><td style="padding:4px 0;word-break:break-word;">${escapeHtml(value)}</td></tr>`
    )
    .join("")

  return `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;line-height:1.5;color:#111;">
      <h1 style="font-size:18px;margin:0 0 12px;">Site feedback</h1>
      <table style="border-collapse:collapse;margin:0 0 16px;">${meta}</table>
      <h2 style="font-size:14px;margin:0 0 8px;">Message</h2>
      <pre style="white-space:pre-wrap;font-family:inherit;margin:0;padding:12px;background:#f4f4f5;border-radius:8px;">${escapeHtml(fields.message)}</pre>
    </div>
  `.trim()
}

const safePath = (pageUrl: string): string => {
  try {
    const url = new URL(pageUrl)
    const path = `${url.pathname}${url.search}` || "/"
    return path.length > 60 ? `${path.slice(0, 57)}…` : path
  } catch {
    return "unknown page"
  }
}
