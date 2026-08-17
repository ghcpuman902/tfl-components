/**
 * Why an arrivals board has no rows. Callers resolve this from fetch result +
 * clock; the board only paints the copy.
 */
export type ArrivalsEmptyKind = "empty" | "ended" | "offline";

export const ARRIVALS_EMPTY_COPY: Record<ArrivalsEmptyKind, string> = {
  empty: "No arrivals right now.",
  ended: "Service has ended for tonight.",
  offline: "You're offline. Arrivals will update when you're back.",
};

/** Per-line / per-route when predictions are missing but the line is still shown. */
export const ARRIVALS_LINE_EMPTY_COPY = "No information";

/** Last spare tile on a short page that still has arrivals. */
export const ARRIVALS_END_COPY = "No more arrivals";

/** Narrow-width step of `ARRIVALS_END_COPY`. Accessible name stays the full phrase. */
export const ARRIVALS_END_COPY_SHORT = "No more";

/**
 * Subgroup heading when TfL sends `Platform Unknown` (or no platform at all)
 * on a live prediction. Distinct from a bound with no heading — that is
 * reserved for true “no bound metadata” (bus lists, empty unseeded lines).
 */
export const ARRIVALS_PLATFORM_UNKNOWN_HEADING = "Platform to be confirmed";

const LONDON_TIME_ZONE = "Europe/London";

const londonHourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON_TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23",
});

/** Europe/London hour (0–23) for an instant. Pass `nowMs` — never default the clock here. */
export const londonHour = (nowMs: number): number => {
  const hour = londonHourFormatter
    .formatToParts(new Date(nowMs))
    .find((part) => part.type === "hour")?.value;
  return hour ? Number(hour) : 0;
};

/**
 * Rough Underground closed window in London local time. Night buses still run,
 * so prefer `empty` for bus boards unless the caller forces `ended`.
 */
export const isLikelyRailServiceEnded = (nowMs: number): boolean => {
  const hour = londonHour(nowMs);
  return hour >= 1 && hour < 5;
};

type ResolveArrivalsEmptyKindOptions = {
  rowCount: number;
  /** Fetch/render failure — board uses `error` instead. */
  hasError?: boolean;
  offline?: boolean;
  /** Rail uses the overnight `ended` heuristic; bus does not. */
  domain?: "rail" | "bus";
  nowMs: number;
};

/**
 * Pick an empty kind when there are no rows. Returns `null` when the board
 * should show arrivals or an error instead.
 */
export const resolveArrivalsEmptyKind = ({
  rowCount,
  hasError = false,
  offline = false,
  domain = "rail",
  nowMs,
}: ResolveArrivalsEmptyKindOptions): ArrivalsEmptyKind | null => {
  if (hasError || rowCount > 0) return null;
  if (offline) return "offline";
  if (domain !== "bus" && isLikelyRailServiceEnded(nowMs)) return "ended";
  return "empty";
};
