/**
 * Display helpers for TfL additional-property values.
 * Parsing lives in tfl-ts (`parseAdditionalPropertyValue`).
 */

import type { AdditionalPropertyPrecision } from "tfl-ts"

export { parseAdditionalPropertyValue } from "tfl-ts"
export type {
  AdditionalPropertyPrecision,
  ParsedAdditionalPropertyValue,
} from "tfl-ts"

const dateOnlyFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/London",
})

/** Absolute en-GB label. Date-only values stay on the calendar day (UTC). */
export const formatAdditionalPropertyDate = (
  ms: number,
  precision: AdditionalPropertyPrecision
): string =>
  precision === "date"
    ? dateOnlyFormatter.format(new Date(ms))
    : dateTimeFormatter.format(new Date(ms))
