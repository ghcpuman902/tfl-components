const timeOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
} as const

const localDayKey = (ms: number): string => {
  const date = new Date(ms)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

const yesterdayKey = (nowMs: number): string => {
  const date = new Date(nowMs)
  date.setDate(date.getDate() - 1)
  return localDayKey(date.getTime())
}

export const formatObservationAge = (
  atMs: number,
  nowMs: number,
  locale?: string,
): string => {
  const elapsed = Math.max(0, nowMs - atMs)
  if (elapsed < 45_000) return "just now"
  if (elapsed < 60 * 60_000) {
    return `${Math.max(1, Math.round(elapsed / 60_000))}m ago`
  }

  if (localDayKey(atMs) === localDayKey(nowMs)) {
    return `${Math.max(1, Math.round(elapsed / 3_600_000))}h ago`
  }

  if (localDayKey(atMs) === yesterdayKey(nowMs)) {
    return `Yesterday ${new Intl.DateTimeFormat(locale, timeOptions).format(new Date(atMs))}`
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...timeOptions,
  }).format(new Date(atMs))
}

export const formatObservationLocal = (
  atMs: number,
  locale?: string,
): string =>
  new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...timeOptions,
  }).format(new Date(atMs))
