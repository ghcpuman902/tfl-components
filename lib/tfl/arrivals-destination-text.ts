import { usableTflText } from "@/lib/tfl/bus-stop-letter"

/**
 * TfL's literal placeholder for a District line prediction where the next
 * train's real destination isn't known yet — confirmed verbatim on TfL's own
 * Paddington board (`tfl.gov.uk/tube/stop/940GZZLUPAC/...`), paired with a
 * `currentLocation` like "At Southfields Platform 1".
 */
const CHECK_FRONT_OF_TRAIN = "Check Front of Train"

const normalisePhrase = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+line$/, "")

const isSamePhrase = (a: string, b: string): boolean =>
  normalisePhrase(a) === normalisePhrase(b)

/**
 * True when a destination string carries no information beyond the line
 * itself — e.g. a Circle line loop train whose `destinationName` is just
 * "Circle Line".
 */
export const isRedundantArrivalsDestination = (
  destination: string,
  lineName: string
): boolean =>
  Boolean(destination && lineName && isSamePhrase(destination, lineName))

/**
 * Resolve what a rail arrivals row should show as its destination.
 *
 * Returns the full, uncut text — abbreviation ("Check Front of Train" →
 * "Check Front" only when it doesn't fit) is `StationName`'s job via the
 * shared abbreviation table, not this function's.
 *
 * - An uninformative destination (redundant with the line name, or the
 *   literal "Check Front of Train" placeholder) paired with a usable
 *   `currentLocation` combines the two, e.g. `"Check Front of Train · At
 *   Southfields Platform 1"` — matches TfL's own board, which shows both.
 * - "Check Front of Train" alone (no `currentLocation` yet) still shows —
 *   it's real information, just wordy, so it's never blanked.
 * - A destination that only repeats the line name, with no `currentLocation`
 *   to add, has nothing left to say — falls back to the line name itself
 *   rather than inventing new copy; callers that want to hide it entirely
 *   can compare the result against `lineName` themselves.
 */
export const resolveArrivalsDestinationText = ({
  destination,
  lineName,
  currentLocation,
}: {
  destination: string
  lineName?: string | null
  currentLocation?: string
}): string => {
  const isCheckFront = isSamePhrase(destination, CHECK_FRONT_OF_TRAIN)
  const isSameAsLine = Boolean(
    lineName && isRedundantArrivalsDestination(destination, lineName)
  )
  if (!isCheckFront && !isSameAsLine) return destination

  const location = usableTflText(currentLocation)
  if (location) return `${destination} · ${location}`
  return destination
}
