const LONDON_TIME_ZONE = "Europe/London"

type GreetingBand = "morning" | "afternoon" | "evening" | "night"

const GREETINGS: Record<GreetingBand, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
  night: "Good night",
}

export const FALLBACK_LONDON_GREETING = GREETINGS.afternoon

const bandForHour = (hour: number): GreetingBand => {
  if (hour >= 5 && hour < 12) return "morning"
  if (hour >= 12 && hour < 17) return "afternoon"
  if (hour >= 17 && hour < 22) return "evening"
  return "night"
}

export const greetingForLondonHour = (hour: number): string =>
  GREETINGS[bandForHour(hour)]

export const londonHour = (date: Date): number =>
  Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: LONDON_TIME_ZONE,
      hour: "numeric",
      hourCycle: "h23",
    }).format(date)
  )

export const londonGreetingAt = (date: Date): string =>
  greetingForLondonHour(londonHour(date))
