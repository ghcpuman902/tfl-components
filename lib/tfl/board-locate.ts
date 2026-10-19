export type LocateFailure =
  | "unsupported"
  | "insecure"
  | "in-app"
  | "denied"
  | "unavailable"
  | "timeout"
  | "no-station"
  | "lookup"

export type LocatePlatform = "ios" | "android" | "mac" | "other"

export const LOCATE_WATCHDOG_MS = 15_000

const IN_APP_BROWSER =
  /FBAN|FBAV|Instagram|Twitter|Line\/|MicroMessenger|; wv\)/

export const locatePlatform = (
  userAgent: string,
  maxTouchPoints = 0
): LocatePlatform => {
  if (/iPhone|iPad|iPod/.test(userAgent)) return "ios"
  if (/Macintosh/.test(userAgent)) return maxTouchPoints > 1 ? "ios" : "mac"
  if (/Android/.test(userAgent)) return "android"
  return "other"
}

export const locateFailureFromGeolocation = (
  code: number,
  userAgent: string
): LocateFailure => {
  if (code === 1) return IN_APP_BROWSER.test(userAgent) ? "in-app" : "denied"
  if (code === 3) return "timeout"
  return "unavailable"
}

const CAUSE: Record<Exclude<LocateFailure, "in-app">, string> = {
  unsupported: "This browser can't share your location",
  insecure: "Location only works on a secure (https) page",
  denied: "Location is blocked for this site",
  unavailable: "Couldn't find your location",
  timeout: "Finding your location took too long",
  "no-station": "There's no station near you",
  lookup: "Couldn't look up stops near you",
}

export const locateFailureSentence = (
  failure: LocateFailure,
  fallbackName: string | null,
  platform: LocatePlatform
): string => {
  if (failure === "in-app") {
    const browser = platform === "ios" ? "Safari" : "your browser"
    return fallbackName
      ? `Open in ${browser} to use your location; showing ${fallbackName} for now.`
      : `Open in ${browser} to use your location.`
  }
  return fallbackName
    ? `${CAUSE[failure]}, so we're showing ${fallbackName}.`
    : `${CAUSE[failure]}.`
}

export const locateFailureAction = (
  failure: LocateFailure
): "retry" | "help" | null => {
  if (failure === "denied") return "help"
  if (
    failure === "unavailable" ||
    failure === "timeout" ||
    failure === "lookup"
  )
    return "retry"
  return null
}

export const LOCATE_HELP: Record<LocatePlatform, string> = {
  ios: "Open Settings › Privacy & Security › Location Services, turn it on and set Safari Websites to While Using the App. Then come back and try again.",
  android:
    "Tap the icon left of the address bar, open Permissions and allow Location. Then try again.",
  mac: "Click the icon left of the address bar and allow Location for this site. If it's already allowed, turn on Location Services for your browser in System Settings › Privacy & Security.",
  other:
    "Click the icon left of the address bar and allow Location for this site. Then try again.",
}
