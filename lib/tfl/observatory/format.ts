import type { ObservatoryState } from "@/lib/tfl/observatory/types"

export const observatoryStateLabel = (
  state: ObservatoryState | "unknown" | "observed"
): string => {
  if (state === "unknown") return "No observation yet"
  if (state === "observed") return "All normal"
  if (state === "current") return "Unchanged"
  if (state === "suspect") return "Suspect"
  if (state === "changed") return "Changed"
  if (state === "incomplete") return "Incomplete"
  return "Unavailable"
}

export const observatoryStateHint = (
  state: ObservatoryState | "observed"
): string => {
  if (state === "observed") {
    return "This run found no metadata change."
  }
  if (state === "current") {
    return "The latest check matches the last confirmed set."
  }
  if (state === "suspect") {
    return "A difference showed up once. The next run has to match it."
  }
  if (state === "changed") {
    return "A difference was confirmed and the baseline was updated."
  }
  if (state === "incomplete") {
    return "TfL sent a malformed or badly incomplete response. The last baseline was kept."
  }
  return "TfL sent nothing usable. The last baseline was kept."
}
