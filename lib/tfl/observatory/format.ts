import { LONDON_TIME_ZONE } from "@/lib/tfl/london-dates"
import type { ObservatoryState } from "@/lib/tfl/observatory/types"

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON_TIME_ZONE,
  dateStyle: "long",
  timeStyle: "short",
})

export const formatObservationTime = (iso: string | null): string | null => {
  if (!iso) return null
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  return `${dateTimeFormatter.format(new Date(ms))} Europe/London`
}

export const observatoryStateLabel = (
  state: ObservatoryState | "unknown" | "observed"
): string => {
  if (state === "unknown") return "No observation yet"
  if (state === "observed") return "Observed"
  if (state === "current") return "Current"
  if (state === "suspect") return "Suspect"
  if (state === "changed") return "Changed"
  if (state === "incomplete") return "Incomplete"
  return "Unavailable"
}

export const observatoryStateHint = (state: ObservatoryState): string => {
  if (state === "current") {
    return "The latest complete observation matches the stored baseline."
  }
  if (state === "suspect") {
    return "A difference appeared and is waiting for a matching confirmation."
  }
  if (state === "changed") {
    return "A metadata difference was confirmed and the baseline was updated."
  }
  if (state === "incomplete") {
    return "TfL returned a malformed or dramatically incomplete response. The baseline was kept."
  }
  return "TfL returned nothing usable. The baseline was kept."
}
